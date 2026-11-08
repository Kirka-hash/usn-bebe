"""REST-эндпоинты для веб-интерфейса (экраны U1–U9 участника и O1–O5 организатора)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.judging.availability import availability_map
from backend.judging.collegia import JudgeCandidate, propose_panel
from backend.ai_advisor.explainer import deficit_options, explain
from backend.registration.models import ApplicationIn, ApplicationStatus, Role
from backend.registration.rules import RuleViolation, role_unavailable_reason

from .deps import auth, registration, usn

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


# ---- Вход (U2) ----
class EmailIn(BaseModel):
    email: str


class CodeIn(EmailIn):
    code: str


@router.post("/auth/request-code")
def request_code(body: EmailIn):
    auth.request_code(body.email)
    return {"sent": True}


@router.post("/auth/verify")
def verify(body: CodeIn):
    token = auth.verify(body.email, body.code)
    if not token:
        raise HTTPException(401, "Неверный код")
    return {"token": token}


# ---- Участник (U1, U3, U4, U7, U8) ----
@router.get("/competitions")
def competitions():
    """U1: только турниры, где открыта хотя бы одна роль."""
    return [c for c in usn.list_competitions() if any(c.open_roles.values())]


@router.get("/competitions/{competition_id}/roles")
def roles(competition_id: str, user_id: str):
    """U4: доступность ролей с причиной для серых кнопок."""
    comp = usn.get_competition(competition_id)
    mine = {a.role for a in registration.find_existing(user_id, competition_id)
            if a.status not in (ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED)}
    now = datetime.now(timezone.utc)
    return {r.value: role_unavailable_reason(comp, r, mine - {r}, now) for r in Role}


@router.post("/applications")
def submit(body: ApplicationIn):
    """U7: создать или обновить заявку (повторная регистрация не создаёт дубль)."""
    try:
        app = registration.submit(body)
    except RuleViolation as e:
        raise HTTPException(422, {"code": e.code, "message": e.message})
    return {"id": app.id, "status": app.participant_status()}


# ---- Организатор (O2–O5) ----
@router.get("/organizer/competitions/{competition_id}/applications")
def org_applications(competition_id: str):
    return usn.list_applications(competition_id)


@router.post("/organizer/applications/{application_id}/status")
def org_set_status(application_id: str, status: ApplicationStatus):
    try:
        return registration.set_status(application_id, status)
    except RuleViolation as e:
        raise HTTPException(404, e.message)


@router.get("/organizer/competitions/{competition_id}/availability")
def org_availability(competition_id: str, panel_size: int = 9, reserve: int = 3):
    comp = usn.get_competition(competition_id)
    return availability_map(comp, usn.list_applications(competition_id), panel_size, reserve)


class PanelRequest(BaseModel):
    candidates: list[JudgeCandidate]
    panel_size: int = 9
    reserve_size: int = 3
    conflict_clubs: list[str] = []


@router.post("/organizer/panel-proposal")
def org_panel(body: PanelRequest):
    """O4/O5: предложение коллегий для поединка + объяснение + варианты при дефиците."""
    p = propose_panel(body.candidates, body.panel_size, body.reserve_size, set(body.conflict_clubs))
    return {"proposal": p, "complete": p.complete, "explanation": explain(p), "options": deficit_options(p)}
