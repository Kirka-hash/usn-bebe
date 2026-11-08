"""Бизнес-правила регистрации (ТЗ USN 6.1.2, Правила ЧМ 2026 п. 4).

Правила проверяются на сервере при каждой отправке заявки. Все функции чистые —
их легко покрыть тестами пограничных случаев.
"""
from __future__ import annotations

from datetime import datetime

from .models import Application, ApplicationIn, ApplicationStatus, Competition, CompetitionFormat, Role

REQUIRED_CONSENTS = ("rules", "pd", "media")
REQUIRED_PROFILE_FIELDS = ("last_name", "first_name", "country", "city")

# Единственное допустимое совмещение ролей в одном соревновании.
ALLOWED_COMBINATIONS = {frozenset({Role.PLAYER, Role.ADVISER})}


class RuleViolation(Exception):
    """Нарушение бизнес-правила. code — для фронтенда, message — для пользователя."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def role_unavailable_reason(
    competition: Competition,
    role: Role,
    existing_roles: set[Role],
    now: datetime,
) -> str | None:
    """Почему роль недоступна (экран U4 — серые роли с причиной). None — доступна."""
    if role == Role.ADVISER and competition.format != CompetitionFormat.CLASSIC:
        return "Секундант доступен только в классических турнирах"
    if not competition.open_roles.get(role, False):
        return "Регистрация в этой роли закрыта"
    deadline = competition.deadlines.get(role)
    if deadline and now > deadline:
        return f"Регистрация закрыта {deadline:%d.%m}"
    if existing_roles and role not in existing_roles:
        combo = frozenset(existing_roles | {role})
        if combo not in ALLOWED_COMBINATIONS:
            return "Несовместимо с вашей ролью в этом турнире"
    return None


def validate_application(
    data: ApplicationIn,
    competition: Competition,
    existing: list[Application],
    competition_players: set[str],
    now: datetime,
) -> None:
    """Серверная проверка заявки перед отправкой в USN (экран U7).

    existing — активные заявки этого пользователя на это соревнование.
    competition_players — user_id игроков этого соревнования.
    """
    active = [a for a in existing if a.status not in (ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED)]
    other_roles = {a.role for a in active if a.role != data.role}

    reason = role_unavailable_reason(competition, data.role, other_roles, now)
    if reason:
        raise RuleViolation("role_unavailable", reason)

    missing = [f for f in REQUIRED_PROFILE_FIELDS if not getattr(data.profile, f).strip()]
    if missing:
        raise RuleViolation("missing_fields", "Заполните обязательные поля: " + ", ".join(missing))

    if not all(data.consents.get(c) for c in REQUIRED_CONSENTS):
        raise RuleViolation("consents", "Нужно принять правила и дать согласия на обработку ПДн и фото/видео")

    me = data.profile.user_id
    if data.role == Role.ADVISER:
        if not data.advised_player_ids:
            raise RuleViolation("adviser_no_player", "Выберите игрока, которому секундируете")
        if me in data.advised_player_ids:
            raise RuleViolation("adviser_self", "Нельзя секундировать самому себе")
        unknown = [p for p in data.advised_player_ids if p not in competition_players]
        if unknown:
            raise RuleViolation("adviser_unknown_player", "Игрока нет в списке — попросите его зарегистрироваться первым")

    if data.role == Role.VOTER:
        block_ids = {b.id for b in competition.availability_blocks}
        if not block_ids:
            # Открытый вопрос к заказчику (В-19): блокировать или принимать без слотов.
            raise RuleViolation("no_blocks", "Слоты для судей пока не открыты")
        if not data.availability_block_ids:
            raise RuleViolation("voter_no_blocks", "Отметьте хотя бы один блок доступности")
        if not set(data.availability_block_ids) <= block_ids:
            raise RuleViolation("voter_bad_block", "Выбран несуществующий блок доступности")

    if data.role == Role.PLAYER and data.partner_user_id is not None:
        if competition.format != CompetitionFormat.TEAM:
            raise RuleViolation("partner_not_team", "Напарник указывается только в командном формате")
        if data.partner_user_id == me:
            raise RuleViolation("partner_self", "Нельзя выбрать себя напарником")
