"""Доменные модели регистрации.

Соревнования, роли, сроки и слоты судей ведутся в Django Admin заказчика (USN).
Здесь — только то, что нужно нашему сервису для проверки правил и показа экранов.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field


class Role(str, Enum):
    PLAYER = "player"     # Игрок
    VOTER = "voter"       # Судья
    ADVISER = "adviser"   # Секундант
    VIEWER = "viewer"     # Зритель


class CompetitionFormat(str, Enum):
    CLASSIC = "classic"   # 9 (или 7) судей в 3 коллегиях, есть секунданты
    EXPRESS = "express"   # 5 судей, одна коллегия, без секундантов
    TEAM = "team"         # команды по 2 игрока, 9 судей, без секундантов


class ApplicationStatus(str, Enum):
    # «Получена» ставится, когда заявка прошла серверную проверку и API USN подтвердил сохранение.
    # Резерв в MVP не входит — организатор работает с ним вручную в Telegram (заказчик, 10.11).
    RECEIVED = "received"     # Получена
    CONFIRMED = "confirmed"   # Подтверждена
    REJECTED = "rejected"     # Отклонена
    WITHDRAWN = "withdrawn"   # Отозвана участником


class AvailabilityBlock(BaseModel):
    """Блок доступности судьи (например, «09:00–11:30 Групповой этап, 1 круг»).

    Важно: блок доступности != слот поединка. В одном блоке идут несколько
    поединков по ~35 минут.
    """

    id: str
    start: datetime
    end: datetime
    title: str
    parallel_duels: int | None = None
    panel_size: int | None = None
    reserve: int | None = None
    max_voters: int | None = Field(default=None, ge=0)
    assigned: int | None = Field(default=None, ge=0)
    available: int | None = Field(default=None, ge=0)


class ScheduledGame(BaseModel):
    id: str
    start: datetime
    end: datetime | None = None
    title: str | None = None


class Competition(BaseModel):
    id: str
    title: str
    format: CompetitionFormat
    open_roles: dict[Role, bool]          # Entry is Open по ролям (из Django Admin)
    deadlines: dict[Role, datetime]       # сроки закрытия по ролям
    availability_blocks: list[AvailabilityBlock] = Field(default_factory=list)
    starts_at: datetime | None = None
    mode: str = ""
    review_demo: bool = False
    days: list[date] = Field(default_factory=list)
    games: list[ScheduledGame] = Field(default_factory=list)


class Profile(BaseModel):
    user_id: str
    email: str
    last_name: str = ""
    first_name: str = ""
    country: str = ""
    city: str = ""
    phone: str = ""
    club: str = ""
    position: str = ""
    company: str = ""
    intro: str = ""
    telegram: str = ""
    vk: str = ""


class ApplicationIn(BaseModel):
    """Данные формы заявки (экраны U5–U7)."""

    competition_id: str
    role: Role
    profile: Profile
    partner_user_id: str | None = None            # игрок, командный формат
    advised_player_ids: list[str] = Field(default_factory=list)  # секундант
    availability_block_ids: list[str] = Field(default_factory=list)  # судья
    consents: dict[str, bool] = Field(default_factory=dict)  # rules, pd, media


class TeamStatus(str, Enum):
    """Статус команды в командном формате (сценарий согласован с заказчиком 17.11).

    Игрок А указывает напарника Б → «ждёт подтверждения»; команда сформирована,
    только когда Б подтвердит участие (или сам при регистрации выберет А).
    """

    AWAITING = "awaiting"     # Ждёт подтверждения напарника
    CONFIRMED = "confirmed"   # Команда подтверждена обоими
    DECLINED = "declined"     # Напарник отклонил / выбрал другого — нужно выбрать нового


class Application(ApplicationIn):
    id: str
    judge_scores: dict[str, float] = Field(default_factory=dict)
    status: ApplicationStatus = ApplicationStatus.RECEIVED
    team_status: TeamStatus | None = None
    created_at: datetime
    updated_at: datetime
