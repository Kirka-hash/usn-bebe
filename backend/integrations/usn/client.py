"""Контракт USN и локальное хранение заявок и профилей для прототипа."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Protocol

from backend.registration.models import Application, Competition, Profile, Role


class USNClient(Protocol):
    def list_competitions(self) -> list[Competition]: ...
    def get_competition(self, competition_id: str) -> Competition: ...
    def list_applications(self, competition_id: str) -> list[Application]: ...
    def get_application(self, application_id: str) -> Application | None: ...
    def save_application(self, app: Application) -> Application: ...
    def get_profile(self, user_id: str) -> Profile | None: ...
    def save_profile(self, profile: Profile) -> Profile: ...
    def list_players(self, search: str = "") -> list[Profile]: ...


class LocalApplicationStore:
    """Хранит заявки и профили в памяти для обоих режимов прототипа."""

    def __init__(self):
        self._applications: dict[str, Application] = {}
        self._profiles: dict[str, Profile] = {}

    def list_applications(self, competition_id: str) -> list[Application]:
        return [a for a in self._applications.values() if a.competition_id == competition_id]

    def get_application(self, application_id: str) -> Application | None:
        return self._applications.get(application_id)

    def save_application(self, app: Application) -> Application:
        self._applications[app.id] = app
        self._profiles[app.profile.user_id] = app.profile
        return app

    def get_profile(self, user_id: str) -> Profile | None:
        return self._profiles.get(user_id)

    def save_profile(self, profile: Profile) -> Profile:
        self._profiles[profile.user_id] = profile
        return profile

    def list_players(self, search: str = "") -> list[Profile]:
        ids = {a.profile.user_id for a in self._applications.values()
               if a.role == Role.PLAYER and a.status.value != "withdrawn"}
        query = search.strip().lower()
        return [p for uid, p in self._profiles.items() if uid in ids
                and query in f"{p.last_name} {p.first_name} {p.city}".lower()]


class MockUSNClient(LocalApplicationStore):
    """In-memory имитация API USN. Данные — data/sample/competition_demo.json (синтетика)."""

    def __init__(self, sample_path: Path | None = None, *, review_demo: bool = False):
        path = sample_path or Path(__file__).resolve().parents[3] / "data" / "sample" / "competition_demo.json"
        raw = json.loads(path.read_text(encoding="utf-8"))
        self._competitions = {c["id"]: Competition(**c) for c in raw["competitions"]}
        super().__init__()
        if sample_path is None and review_demo:
            from backend.judging.review import REVIEW_ID, seed_review

            self._competitions[REVIEW_ID] = seed_review(self, self._competitions[REVIEW_ID])

    def list_competitions(self) -> list[Competition]:
        return list(self._competitions.values())

    def get_competition(self, competition_id: str) -> Competition:
        return self._competitions[competition_id]
