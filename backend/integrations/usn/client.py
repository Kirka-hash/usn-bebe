"""Адаптер API USN (Django заказчика).

Все обращения к системе заказчика идут только через этот модуль — ядро и
Django Admin мы не трогаем. Сейчас работает MockUSNClient на демо-данных;
HttpUSNClient — заглушка до получения доступа к тестовому стенду (SSH-ключи)
и сверки методов Swagger проверочными вызовами.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Protocol

from backend.registration.models import Application, Competition


class USNClient(Protocol):
    def list_competitions(self) -> list[Competition]: ...
    def get_competition(self, competition_id: str) -> Competition: ...
    def list_applications(self, competition_id: str) -> list[Application]: ...
    def get_application(self, application_id: str) -> Application | None: ...
    def save_application(self, app: Application) -> Application: ...


class MockUSNClient:
    """In-memory имитация API USN. Данные — data/sample/competition_demo.json (синтетика)."""

    def __init__(self, sample_path: Path | None = None):
        path = sample_path or Path(__file__).resolve().parents[3] / "data" / "sample" / "competition_demo.json"
        raw = json.loads(path.read_text(encoding="utf-8"))
        self._competitions = {c["id"]: Competition(**c) for c in raw["competitions"]}
        self._applications: dict[str, Application] = {}

    def list_competitions(self) -> list[Competition]:
        return list(self._competitions.values())

    def get_competition(self, competition_id: str) -> Competition:
        return self._competitions[competition_id]

    def list_applications(self, competition_id: str) -> list[Application]:
        return [a for a in self._applications.values() if a.competition_id == competition_id]

    def get_application(self, application_id: str) -> Application | None:
        return self._applications.get(application_id)

    def save_application(self, app: Application) -> Application:
        self._applications[app.id] = app
        return app


class HttpUSNClient:
    """ЗАГЛУШКА. Реальный клиент к API USN (Basic Auth из .env).

    TODO (спринт 3, Тимофей): сопоставить методы Swagger со сценариями вызовами;
    недостающее (статусы, связи заявок, сохранение коллегий) — запросом заказчику.
    """

    def __init__(self, base_url: str, user: str, password: str):
        self.base_url, self.user, self.password = base_url, user, password

    def __getattr__(self, name):
        raise NotImplementedError(f"HttpUSNClient.{name}: ждём доступ к тестовому стенду USN")
