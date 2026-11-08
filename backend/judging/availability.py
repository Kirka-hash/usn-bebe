"""Карта доступности судей (экран O3): судьи × блоки, итог «доступно / нужно»."""
from __future__ import annotations

from pydantic import BaseModel

from backend.registration.models import Application, ApplicationStatus, Competition, Role


class BlockSummary(BaseModel):
    block_id: str
    title: str
    available: int
    needed: int
    state: str  # ok | no_reserve | deficit


def availability_map(
    competition: Competition,
    applications: list[Application],
    panel_size: int,
    reserve: int,
    parallel_duels: int = 1,
) -> list[BlockSummary]:
    """panel_size и reserve задаёт организатор (не зашиты в алгоритм, ТЗ 6.1.3)."""
    judges = [
        a for a in applications
        if a.role == Role.VOTER and a.status not in (ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED)
    ]
    out = []
    for block in competition.availability_blocks:
        available = sum(1 for j in judges if block.id in j.availability_block_ids)
        needed = parallel_duels * (panel_size + reserve)
        if available >= needed:
            state = "ok"
        elif available >= parallel_duels * panel_size:
            state = "no_reserve"
        else:
            state = "deficit"
        out.append(BlockSummary(block_id=block.id, title=block.title, available=available, needed=needed, state=state))
    return out
