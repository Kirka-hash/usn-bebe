"""Сервис регистрации: поиск существующей заявки (без дублей), создание/правка, статусы."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from backend.integrations.usn.client import USNClient

from .models import Application, ApplicationIn, ApplicationStatus, Role
from .rules import RuleViolation, validate_application


class RegistrationService:
    def __init__(self, usn: USNClient):
        self.usn = usn

    def find_existing(self, user_id: str, competition_id: str, role: Role | None = None) -> list[Application]:
        apps = [a for a in self.usn.list_applications(competition_id) if a.profile.user_id == user_id]
        return [a for a in apps if role is None or a.role == role]

    def submit(self, data: ApplicationIn, now: datetime | None = None) -> Application:
        """Создаёт заявку или обновляет существующую в той же роли (повторная регистрация != дубль)."""
        now = now or datetime.now(timezone.utc)
        competition = self.usn.get_competition(data.competition_id)
        existing = self.find_existing(data.profile.user_id, data.competition_id)
        players = {a.profile.user_id for a in self.usn.list_applications(data.competition_id) if a.role == Role.PLAYER}
        validate_application(data, competition, existing, players, now)

        same_role = [a for a in existing if a.role == data.role and a.status != ApplicationStatus.WITHDRAWN]
        if same_role:
            current = same_role[0]
            updated = Application(
                **data.model_dump(), id=current.id, status=current.status,
                created_at=current.created_at, updated_at=now,
            )
            # Открытый вопрос к заказчику (В-18): сбрасывать ли статус подтверждённой заявки при правке.
            return self.usn.save_application(updated)

        app = Application(**data.model_dump(), id=str(uuid.uuid4()), created_at=now, updated_at=now)
        return self.usn.save_application(app)

    def set_status(self, application_id: str, status: ApplicationStatus) -> Application:
        """Смена статуса организатором (экран O2)."""
        app = self.usn.get_application(application_id)
        if app is None:
            raise RuleViolation("not_found", "Заявка не найдена")
        return self.usn.save_application(app.model_copy(update={"status": status}))
