"""Данные репетиции и расчёт коллегий на локальных заявках."""
import json
from pathlib import Path

from backend.api.auth import EmailCodeAuth
from backend.judging.collegia import Collegium, JudgeCandidate, propose_panel
from backend.registration.models import Application, ApplicationStatus, AvailabilityBlock, Profile, Role, ScheduledGame

REVIEW_ID = "cup-challenge-classic"
SCENARIO = json.loads((Path(__file__).resolve().parents[2] / "data/sample/review_tournament.json").read_text(encoding="utf-8"))
PANEL = SCENARIO["panel_size"]
RESERVE = SCENARIO["reserve"]
COLLEGIA = (Collegium.HIRING, Collegium.SENDING, Collegium.OWNERSHIP)
INACTIVE = (ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED)


def scores(judge_number):
    return {col: 3 - (judge_number + index) % 3 for index, col in enumerate(COLLEGIA)}


def seed_review(store, competition):
    blocks = [AvailabilityBlock(**item, parallel_duels=1, panel_size=PANEL, reserve=RESERVE) for item in SCENARIO["blocks"]]
    competition = competition.model_copy(update={
        "review_demo": True,
        "availability_blocks": blocks,
        "games": [ScheduledGame.model_validate(item) for item in SCENARIO["games"]],
        "days": sorted({block.start.date() for block in blocks}),
    })
    names = ("Алексей", "Борис", "Виктор", "Глеб", "Даниил", "Егор", "Илья", "Михаил", "Олег")
    surnames = ("Берестов", "Ветров", "Горин", "Долин", "Елисеев", "Лукин", "Миронов", "Рябов", "Соколов")
    now = competition.deadlines[Role.PLAYER]
    for number in range(1, 45):
        judge = number <= 36
        profile = Profile(
            user_id=f"review-{number}", email=f"review{number}@example.test",
            first_name=names[(number - 1) % 9], last_name=surnames[(number - 1) // 9],
            country="Россия", city=("Дубна", "Тверь", "Казань")[number % 3],
            club=f"Клуб «Диалог {number % 5 + 1}»", company="Учебная компания «Вектор»",
            position="Руководитель проекта", telegram=f"@demo_usn_{number}",
        )
        if judge:
            regular_blocks = [block.id for index, block in enumerate(blocks[:-1])
                              if ((number - 1 - index * 5) % 36) < 14]
            if number <= 7:
                regular_blocks.append(SCENARIO["deficit_block"])
        else:
            regular_blocks = []
        store.save_application(Application(
            id=f"review-{number}", competition_id=competition.id, role=Role.VOTER if judge else Role.PLAYER,
            profile=profile, availability_block_ids=regular_blocks,
            judge_scores=scores(number) if judge else {},
            status=ApplicationStatus.CONFIRMED if judge or number % 2 else ApplicationStatus.RECEIVED,
            created_at=now, updated_at=now, consents={"rules": True, "pd": True, "media": True},
        ))
    for kind, first_name, last_name, city, club, position in (
        ("player", "Анна", "Воронцова", "Дубна", "Переговорная практика", "Менеджер проектов"),
        ("judge", "Сергей", "Лавров", "Тверь", "Деловой диалог", "Руководитель отдела обучения"),
    ):
        email = f"{kind}@usn.example.test"
        store.save_profile(Profile(
            user_id=EmailCodeAuth.user_id(email), email=email, first_name=first_name,
            last_name=last_name, country="Россия", city=city, club=club, position=position,
            company="Учебная компания «Маяк»", phone="+7 000 000-00-00",
            telegram=f"@usn_demo_{kind}", vk=f"https://example.test/{kind}",
            intro=f"{first_name} {last_name}",
        ))
    return competition


def review_state(entries):
    judges = [a for a in entries if a.role == Role.VOTER and a.status not in INACTIVE]
    plans, issues = [], []
    for game in SCENARIO["games"]:
        block = game["block_id"]
        candidates = [candidate(a) for a in judges if block in a.availability_block_ids]
        plan = propose_panel(candidates, PANEL, RESERVE)
        ratings = {c.judge_id: c.scores for c in candidates}
        plans.append({"id": game["id"], "title": game["title"], "start": game["start"], "proposal": plan,
                      "complete": plan.complete, "judge_scores": ratings,
                      "reserve_scores": {key: ratings[key] for key in plan.reserve}})
        if not plan.complete:
            needed = sum(plan.missing.values())
            # Сохраняем доступных судей и добавляем кандидатов для состава и резерва.
            extra = [a for a in judges if block not in a.availability_block_ids and a.status == ApplicationStatus.CONFIRMED
                     and a.availability_block_ids]
            extra.sort(key=lambda a: (-max(candidate(a).scores.values()), a.id))
            target = needed + max(0, RESERVE - len(plan.reserve))
            suggestions = extra[:target]
            issues.append({"game_id": game["id"], "block_id": block, "needed": needed,
                           "suggestions": [{"id": a.id, "label": candidate(a).judge_id} for a in suggestions],
                           "can_resolve": len(suggestions) == target})
    return {"plans": plans, "issues": issues, "panel_size": PANEL, "reserve": RESERVE}


def candidate(application):
    number = application.id.removeprefix("review-") if application.id.startswith("review-") else ""
    label = f"JUDGE_{int(number):03d}" if number.isdecimal() else f"JUDGE_{application.id[:8]}"
    return JudgeCandidate(judge_id=label, scores=application.judge_scores or {col: 2 for col in COLLEGIA})
