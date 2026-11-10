"""Подбор судейских коллегий (ИИ-помощник, задача «А»).

Детерминированный алгоритм (ADR-0002): баллы экспертов 1–3 по коллегиям
(среднее двух экспертов, H-03) + доступность + составы по правилам 9.7/9.9 +
конфликт интересов по клубу. LLM здесь не участвует — только объясняет (ai_advisor).

Сейчас — жадная базовая версия для одного поединка. В спринте 3: оптимизация
на весь турнир (OR-Tools) и сравнение с LLM-подбором (H-05).
"""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class Collegium(str, Enum):
    HIRING = "hiring"          # «Нанимающиеся на работу»
    SENDING = "sending"        # «Отправляющие на переговоры»
    OWNERSHIP = "ownership"    # «Доверяющие собственность»
    # Экспресс: одна коллегия «Отправляющие на переговоры», но балл берётся из столбца
    # «отправляющий на жёсткие переговоры» — способность судить экспресс-поединки (заказчик, 10.11).
    EXPRESS = "express"


# Составы задаёт регламент соревнования (организатор), ИИ их НЕ сокращает (заказчик, 10.11):
# классика/командный — 9 = 3/3/3 (по правилам допустимо 7 = 2/3/2, если так задано на турнир);
# экспресс — 5 судей.
COMPOSITIONS = {
    9: {Collegium.HIRING: 3, Collegium.SENDING: 3, Collegium.OWNERSHIP: 3},
    7: {Collegium.HIRING: 2, Collegium.SENDING: 3, Collegium.OWNERSHIP: 2},
    5: {Collegium.EXPRESS: 5},
}

# Принадлежность к USN конфликтом интересов не считается (ТЗ 6.1.3).
NEUTRAL_CLUBS = ("usn", "универсальная школа переговоров")


def is_conflict(judge_club: str, player_clubs: set[str]) -> bool:
    """Конфликт интересов: судья из той же школы/клуба, что игрок.

    Связка «тренер–ученик» определяется по названию школы (заказчик, 10.11),
    поэтому покрывается тем же правилом.
    """
    club = judge_club.strip().lower()
    if not club or any(n in club for n in NEUTRAL_CLUBS):
        return False
    return club in {c.strip().lower() for c in player_clubs if c}


class JudgeCandidate(BaseModel):
    judge_id: str                         # обезличенный ID (JUDGE_xxx)
    # Средний балл двух экспертов (ОС и КС), 1–3; если оценка есть у одного — берём её
    # (правило объединения выбрала команда, заказчик 10.11: «решать вам»).
    scores: dict[Collegium, float]
    club: str = ""


class Assignment(BaseModel):
    judge_id: str
    collegium: Collegium
    score: float
    reasons: list[str] = Field(default_factory=list)


class PanelProposal(BaseModel):
    panel_size: int
    assignments: list[Assignment]
    reserve: list[str]
    missing: dict[Collegium, int]         # сколько не хватает по коллегиям

    @property
    def complete(self) -> bool:
        return not any(self.missing.values())


def propose_panel(
    candidates: list[JudgeCandidate],
    panel_size: int = 9,
    reserve_size: int = 3,
    conflict_clubs: set[str] | None = None,
) -> PanelProposal:
    """Предложение коллегий для одного поединка. Решение всегда утверждает организатор."""
    need = dict(COMPOSITIONS[panel_size])
    player_clubs = conflict_clubs or set()
    pool = [c for c in candidates if not is_conflict(c.club, player_clubs)]

    # Сначала сильнейшие пары (судья, коллегия) — так судья попадает в коллегию с максимальным баллом.
    pairs = sorted(
        ((c, col, c.scores.get(col, 0.0)) for c in pool for col in need),
        key=lambda t: (-t[2], t[0].judge_id),
    )
    used: set[str] = set()
    assignments: list[Assignment] = []
    for cand, col, score in pairs:
        if cand.judge_id in used or need[col] == 0:
            continue
        best = max((cand.scores.get(k, 0.0) for k in COMPOSITIONS[panel_size]), default=0)
        reasons = [f"балл {score:.1f} в коллегии"]
        if score >= best:
            reasons.append("это его сильнейшая коллегия")
        assignments.append(Assignment(judge_id=cand.judge_id, collegium=col, score=score, reasons=reasons))
        used.add(cand.judge_id)
        need[col] -= 1

    rest = sorted(
        (c for c in pool if c.judge_id not in used),
        key=lambda c: (-max((c.scores.get(k, 0.0) for k in COMPOSITIONS[panel_size]), default=0), c.judge_id),
    )
    reserve = [c.judge_id for c in rest[:reserve_size]]
    return PanelProposal(panel_size=panel_size, assignments=assignments, reserve=reserve, missing=need)
