"""Сервис регистрации: поиск существующей заявки (без дублей), создание/правка, статусы, команды."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from backend.integrations.usn.client import USNClient

from .models import Application, ApplicationIn, ApplicationStatus, CompetitionFormat, Role, TeamStatus
from .rules import RuleViolation, validate_application

INACTIVE = (ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED)


class RegistrationService:
    def __init__(self, usn: USNClient):
        self.usn = usn

    def find_existing(self, user_id: str, competition_id: str, role: Role | None = None) -> list[Application]:
        apps = [a for a in self.usn.list_applications(competition_id) if a.profile.user_id == user_id]
        return [a for a in apps if role is None or a.role == role]

    def _player_app(self, user_id: str, competition_id: str) -> Application | None:
        apps = [a for a in self.find_existing(user_id, competition_id, Role.PLAYER) if a.status not in INACTIVE]
        return apps[0] if apps else None

    def submit(self, data: ApplicationIn, now: datetime | None = None) -> Application:
        """Создаёт заявку или обновляет существующую в той же роли (повторная регистрация != дубль)."""
        now = now or datetime.now(timezone.utc)
        competition = self.usn.get_competition(data.competition_id)
        existing = self.find_existing(data.profile.user_id, data.competition_id)
        players = {a.profile.user_id for a in self.usn.list_applications(data.competition_id) if a.role == Role.PLAYER}
        validate_application(data, competition, existing, players, now)

        is_team = data.role == Role.PLAYER and competition.format == CompetitionFormat.TEAM
        if is_team and data.partner_user_id:
            self._check_partner_free(data.competition_id, data.profile.user_id, data.partner_user_id)

        same_role = [a for a in existing if a.role == data.role and a.status != ApplicationStatus.WITHDRAWN]
        if same_role:
            current = same_role[0]
            app = Application(
                **data.model_dump(), id=current.id, status=current.status,
                team_status=current.team_status, created_at=current.created_at, updated_at=now,
            )
            # Сменил напарника — прежнему напарнику команда больше не подтверждена.
            if is_team and current.partner_user_id and current.partner_user_id != data.partner_user_id:
                self._release_partner(data.competition_id, current.partner_user_id, data.profile.user_id, now)
        else:
            app = Application(**data.model_dump(), id=str(uuid.uuid4()), created_at=now, updated_at=now)

        if is_team:
            app = self._link_team(app, now)
        return self.usn.save_application(app)

    # ---------- командный формат ----------
    def _check_partner_free(self, competition_id: str, me: str, partner: str) -> None:
        partner_app = self._player_app(partner, competition_id)
        if (
            partner_app
            and partner_app.team_status == TeamStatus.CONFIRMED
            and partner_app.partner_user_id not in (None, me)
        ):
            raise RuleViolation("partner_taken", "Этот игрок уже в подтверждённой команде с другим напарником")

    def _link_team(self, app: Application, now: datetime) -> Application:
        """Если напарник уже выбрал нас — команда подтверждается сразу у обоих, иначе ждём подтверждения."""
        if not app.partner_user_id:
            return app.model_copy(update={"team_status": None})
        partner_app = self._player_app(app.partner_user_id, app.competition_id)
        if partner_app and partner_app.partner_user_id == app.profile.user_id:
            self.usn.save_application(partner_app.model_copy(update={"team_status": TeamStatus.CONFIRMED, "updated_at": now}))
            return app.model_copy(update={"team_status": TeamStatus.CONFIRMED})
        # TODO (спринт 4): уведомить напарника письмом через NotificationService.
        return app.model_copy(update={"team_status": TeamStatus.AWAITING})

    def _release_partner(self, competition_id: str, old_partner: str, me: str, now: datetime) -> None:
        old = self._player_app(old_partner, competition_id)
        if old and old.partner_user_id == me:
            self.usn.save_application(old.model_copy(update={"team_status": TeamStatus.DECLINED, "updated_at": now}))

    def team_invitations(self, user_id: str, competition_id: str) -> list[Application]:
        """Кто указал пользователя напарником и ждёт подтверждения (экран U6a/U8 у второго игрока)."""
        return [
            a for a in self.usn.list_applications(competition_id)
            if a.role == Role.PLAYER and a.status not in INACTIVE
            and a.partner_user_id == user_id and a.team_status == TeamStatus.AWAITING
        ]

    def confirm_team(self, competition_id: str, user_id: str, inviter_id: str, now: datetime | None = None) -> Application:
        """Второй игрок подтверждает, что он участник команды. Нужна его собственная заявка игрока."""
        now = now or datetime.now(timezone.utc)
        inviter = self._player_app(inviter_id, competition_id)
        if not inviter or inviter.partner_user_id != user_id or inviter.team_status != TeamStatus.AWAITING:
            raise RuleViolation("no_invitation", "Приглашение в команду не найдено или уже неактуально")
        mine = self._player_app(user_id, competition_id)
        if mine is None:
            raise RuleViolation("register_first", "Сначала зарегистрируйтесь на турнир как игрок — напарник подставится автоматически")
        self._check_partner_free(competition_id, inviter_id, user_id)
        if mine.partner_user_id and mine.partner_user_id != inviter_id:
            self._release_partner(competition_id, mine.partner_user_id, user_id, now)
        self.usn.save_application(inviter.model_copy(update={"team_status": TeamStatus.CONFIRMED, "updated_at": now}))
        return self.usn.save_application(mine.model_copy(update={
            "partner_user_id": inviter_id, "team_status": TeamStatus.CONFIRMED, "updated_at": now,
        }))

    def decline_team(self, competition_id: str, user_id: str, inviter_id: str, now: datetime | None = None) -> Application:
        """Второй игрок отказывается: у пригласившего статус «отклонено», он выбирает другого напарника."""
        now = now or datetime.now(timezone.utc)
        inviter = self._player_app(inviter_id, competition_id)
        if not inviter or inviter.partner_user_id != user_id:
            raise RuleViolation("no_invitation", "Приглашение в команду не найдено")
        return self.usn.save_application(inviter.model_copy(update={"team_status": TeamStatus.DECLINED, "updated_at": now}))

    # ---------- организатор ----------
    def set_status(self, application_id: str, status: ApplicationStatus) -> Application:
        """Смена статуса организатором (экран O2)."""
        app = self.usn.get_application(application_id)
        if app is None:
            raise RuleViolation("not_found", "Заявка не найдена")
        return self.usn.save_application(app.model_copy(update={"status": status}))
