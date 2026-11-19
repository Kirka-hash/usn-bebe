"""REST-эндпоинты для веб-интерфейса (экраны U1–U9 участника и O1–O5 организатора)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from backend.judging.availability import availability_map
from backend.judging.collegia import JudgeCandidate, propose_panel
from backend.ai_advisor.explainer import deficit_options, explain
from backend.registration.models import ApplicationIn, ApplicationStatus, Profile, Role
from backend.registration.rules import RuleViolation, role_unavailable_reason

from .deps import auth, organizer_auth, registration, usn

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
    return {"token": token, "user_id": auth.user_id(body.email)}


def bearer(authorization: str | None) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    return token if scheme.lower() == "bearer" else ""


def current_identity(authorization: str | None = Header(default=None)) -> tuple[str, str]:
    token = bearer(authorization)
    email = auth.user_email(token)
    if not email:
        raise HTTPException(401, "Сначала войдите по email")
    return auth.user_id(email), email


@router.post("/auth/logout")
def logout(authorization: str | None = Header(default=None)):
    auth.logout(bearer(authorization))
    return {"ok": True}


def require_owner(user_id: str, identity: tuple[str, str]) -> None:
    if user_id != identity[0]:
        raise HTTPException(403, "Доступны только ваши данные")


@router.get("/auth/me")
def me(authorization: str | None = Header(default=None)):
    user_id, email = current_identity(authorization)
    return {"user_id": user_id, "email": email, "profile": usn.get_profile(user_id)}


@router.put("/users/me/profile")
def save_profile(profile: Profile, authorization: str | None = Header(default=None)):
    user_id, email = current_identity(authorization)
    return usn.save_profile(profile.model_copy(update={"user_id": user_id, "email": email}))


# ---- Участник (U1, U3, U4, U7, U8) ----
@router.get("/competitions")
def competitions():
    """U1: только турниры, где открыта хотя бы одна роль."""
    return [c for c in usn.list_competitions() if any(c.open_roles.values())]


@router.get("/competitions/{competition_id}")
def competition(competition_id: str):
    """U3: карточка турнира (формат, сроки по ролям, блоки доступности судей)."""
    try:
        return usn.get_competition(competition_id)
    except KeyError:
        raise HTTPException(404, "Соревнование не найдено")


@router.get("/users/{user_id}/applications")
def my_applications(user_id: str, identity: tuple[str, str] = Depends(current_identity)):
    """U8/U9: все заявки пользователя по всем турнирам (статус, статус команды)."""
    require_owner(user_id, identity)
    return [a for c in usn.list_competitions() for a in usn.list_applications(c.id) if a.profile.user_id == user_id]


@router.get("/players")
def players(search: str = "", competition_id: str | None = None,
            authorization: str | None = Header(default=None)):
    current_identity(authorization)
    profiles = usn.list_players(search)
    if competition_id:
        registered = {a.profile.user_id for a in usn.list_applications(competition_id)
                      if a.role == Role.PLAYER and a.status != ApplicationStatus.WITHDRAWN}
        profiles = [p for p in profiles if p.user_id in registered]
    return [{"id": p.user_id, "name": f"{p.last_name} {p.first_name}".strip(),
             "club": p.club, "city": p.city} for p in profiles]


@router.get("/competitions/{competition_id}/roles")
def roles(competition_id: str, user_id: str, identity: tuple[str, str] = Depends(current_identity)):
    """U4: доступность ролей с причиной для серых кнопок."""
    comp = competition(competition_id)
    require_owner(user_id, identity)
    mine = {a.role for a in registration.find_existing(user_id, competition_id)
            if a.status not in (ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED)}
    now = datetime.now(timezone.utc)
    return {r.value: role_unavailable_reason(comp, r, mine - {r}, now) for r in Role}


@router.post("/applications")
def submit(body: ApplicationIn, identity: tuple[str, str] = Depends(current_identity)):
    """U7: создать или обновить заявку (повторная регистрация не создаёт дубль)."""
    user_id, email = identity
    body = body.model_copy(update={"profile": body.profile.model_copy(update={"user_id": user_id, "email": email})})
    try:
        app = registration.submit(body)
    except RuleViolation as e:
        raise HTTPException(422, {"code": e.code, "message": e.message})
    except KeyError:
        raise HTTPException(404, "Соревнование не найдено")
    return {"id": app.id, "status": app.status, "team_status": app.team_status}


@router.post("/applications/{application_id}/withdraw")
def withdraw(application_id: str, authorization: str | None = Header(default=None)):
    user_id, _ = current_identity(authorization)
    try:
        return registration.withdraw(application_id, user_id)
    except RuleViolation as e:
        raise HTTPException(404, {"code": e.code, "message": e.message})


# ---- Командный формат: подтверждение напарником (U6a, U8) ----
class TeamAction(BaseModel):
    user_id: str      # кто подтверждает / отклоняет (второй игрок)
    inviter_id: str   # кто указал его напарником


@router.get("/competitions/{competition_id}/team-invitations")
def team_invitations(competition_id: str, user_id: str, identity: tuple[str, str] = Depends(current_identity)):
    require_owner(user_id, identity)
    return [{"inviter_id": a.profile.user_id, "inviter_name": f"{a.profile.last_name} {a.profile.first_name}"}
            for a in registration.team_invitations(user_id, competition_id)]


@router.post("/competitions/{competition_id}/team/confirm")
def team_confirm(competition_id: str, body: TeamAction,
                 identity: tuple[str, str] = Depends(current_identity)):
    require_owner(body.user_id, identity)
    try:
        app = registration.confirm_team(competition_id, body.user_id, body.inviter_id)
    except RuleViolation as e:
        raise HTTPException(422, {"code": e.code, "message": e.message})
    return {"id": app.id, "team_status": app.team_status}


@router.post("/competitions/{competition_id}/team/decline")
def team_decline(competition_id: str, body: TeamAction,
                 identity: tuple[str, str] = Depends(current_identity)):
    require_owner(body.user_id, identity)
    try:
        registration.decline_team(competition_id, body.user_id, body.inviter_id)
    except RuleViolation as e:
        raise HTTPException(422, {"code": e.code, "message": e.message})
    return {"declined": True}


# ---- Организатор (O2–O5) ----
class OrganizerCredentials(EmailIn):
    password: str


@router.post("/organizer/login")
def organizer_login(body: OrganizerCredentials):
    token = organizer_auth.login(body.email, body.password)
    if not token:
        raise HTTPException(401, "Неверный логин или пароль организатора")
    return {"token": token, "email": organizer_auth.email}


def organizer_session(authorization: str | None = Header(default=None)) -> str:
    token = bearer(authorization)
    if not organizer_auth.accepts(token):
        raise HTTPException(401, "Войдите как организатор")
    return token


organizer = APIRouter(prefix="/organizer", dependencies=[Depends(organizer_session)])


@organizer.get("/me")
def organizer_me():
    return {"email": organizer_auth.email}


@organizer.post("/logout")
def organizer_logout(token: str = Depends(organizer_session)):
    organizer_auth.logout(token)
    return {"ok": True}


@organizer.get("/competitions/{competition_id}/applications")
def org_applications(competition_id: str):
    return usn.list_applications(competition_id)


@organizer.post("/applications/{application_id}/status")
def org_set_status(application_id: str, status: ApplicationStatus):
    try:
        return registration.set_status(application_id, status)
    except RuleViolation as e:
        raise HTTPException(404, e.message)


@organizer.get("/competitions/{competition_id}/availability")
def org_availability(competition_id: str, panel_size: int = 9, reserve: int = 3):
    comp = competition(competition_id)
    return availability_map(comp, usn.list_applications(competition_id), panel_size, reserve)


def require_review(competition_id: str) -> None:
    from backend.config import settings
    from backend.judging.review import REVIEW_ID

    if not (settings.review_demo and settings.usn_mode == "mock" and competition_id == REVIEW_ID):
        raise HTTPException(404, "Демо показа не включено")


@organizer.get("/competitions/{competition_id}/review")
def org_review(competition_id: str):
    from backend.judging.review import review_state

    require_review(competition_id)
    return review_state(usn.list_applications(competition_id))


@organizer.post("/competitions/{competition_id}/review/{game_id}/apply")
def org_apply_review(competition_id: str, game_id: str):
    require_review(competition_id)
    state = org_review(competition_id)
    if not any(plan["id"] == game_id for plan in state["plans"]):
        raise HTTPException(404, "Поединок не найден")
    issue = next((item for item in state["issues"] if item["game_id"] == game_id), None)
    if issue is None:
        return state
    if not issue["can_resolve"]:
        raise HTTPException(409, "Недостаточно судей, чтобы закрыть дефицит")
    # В демо эта кнопка моделирует полученное согласие судей на расширение доступности.
    for suggestion in issue["suggestions"]:
        application = usn.get_application(suggestion["id"])
        ids = [*application.availability_block_ids, issue["block_id"]]
        usn.save_application(application.model_copy(update={
            "availability_block_ids": ids, "updated_at": datetime.now(timezone.utc),
        }))
    return org_review(competition_id)


class PanelRequest(BaseModel):
    candidates: list[JudgeCandidate]
    panel_size: int = 9
    reserve_size: int = 3
    conflict_clubs: list[str] = []  # школы/клубы игроков поединка (тренер–ученик — по названию школы)


@organizer.post("/panel-proposal")
def org_panel(body: PanelRequest):
    """O4/O5: предложение коллегий для поединка + объяснение + варианты при дефиците."""
    p = propose_panel(body.candidates, body.panel_size, body.reserve_size, set(body.conflict_clubs))
    return {"proposal": p, "complete": p.complete, "explanation": explain(p), "options": deficit_options(p)}


router.include_router(organizer)
