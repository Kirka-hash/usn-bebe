"""Чтение каталога USN по HTTP. Изменения заявок и профилей остаются в памяти."""
from __future__ import annotations

from collections.abc import Iterator
from datetime import date, datetime, time, timezone
from typing import Any

import httpx

from backend.registration.models import AvailabilityBlock, Competition, CompetitionFormat, Role, ScheduledGame

from .client import LocalApplicationStore


class USNReadError(Exception):
    """Стенд не ответил или вернул данные, которые нельзя преобразовать."""


FORMATS = {"classic": CompetitionFormat.CLASSIC, "quick": CompetitionFormat.EXPRESS, "team": CompetitionFormat.TEAM}


def _items(payload: Any) -> list[dict]:
    if isinstance(payload, dict):
        payload = payload.get("results", payload.get("items"))
    if not isinstance(payload, list) or not all(isinstance(item, dict) for item in payload):
        raise ValueError("Expected a list of objects")
    return payload


def _day(item: dict) -> date:
    return date.fromisoformat(item["date"])


def _instant(value: str, day: date) -> datetime:
    return datetime.combine(day, time.fromisoformat(value), tzinfo=timezone.utc)


def _competition(item: dict) -> Competition:
    format_code = item["competition_type"]
    days = _items(item["days"])
    return Competition(
        id=str(item["id"]),
        title=item["name"],
        format=FORMATS[format_code],
        open_roles={role: item[f"{role.value}_entry_open"] for role in Role},
        deadlines={},
        days=sorted({_day(day) for day in days}),
    )


def _schedule(item: dict) -> list[ScheduledGame]:
    games = []
    for day in _items(item["days"]):
        for entry in _items(day["schedule_items"]):
            game = entry["game"]
            if game is None:
                continue
            games.append(ScheduledGame(
                id=str(game["id"]),
                start=_instant(entry["start_time"], _day(day)),
                end=_instant(entry["end_time"], _day(day)),
                title=entry.get("round_name") or entry.get("tournament_stage"),
            ))
    return sorted(games, key=lambda game: game.start)


def _slot(item: dict, games: list[ScheduledGame]) -> AvailabilityBlock:
    day = date.fromisoformat(item["slot_day"])
    start = _instant(item["start_time"], day)
    end = _instant(item["end_time"], day)
    if end <= start:
        raise ValueError("Invalid time slot interval")
    titles = dict.fromkeys(game.title for game in games if game.title and
                           game.start < end and (game.start >= start or (game.end and game.end > start)))
    return AvailabilityBlock(
        id=str(item["id"]), start=start, end=end,
        title=item.get("title") or ", ".join(titles) or "Блок доступности",
        max_voters=item.get("max_voters"), assigned=item.get("assigned"), available=item.get("available"),
    )


class HttpUSNClient(LocalApplicationStore):
    def __init__(self, base_url: str, user: str, password: str, *, transport: httpx.BaseTransport | None = None):
        super().__init__()
        if not base_url or not user or not password:
            raise ValueError("Для USN_MODE=http задайте USN_API_URL, USN_API_USER и USN_API_PASSWORD")
        url = httpx.URL(base_url)
        if url.scheme != "https" or not url.host or url.userinfo or url.query or url.fragment:
            raise ValueError("USN_API_URL должен быть HTTPS-адресом API без логина, пароля и параметров")
        self._http_options = {
            "base_url": base_url.rstrip("/") + "/", "auth": (user, password),
            "timeout": 8.0, "transport": transport,
        }

    @staticmethod
    def _get(http: httpx.Client, path: str, *, params: dict | None = None, missing_id: str | None = None):
        try:
            response = http.get(path, params=params)
            if response.status_code == 404 and missing_id is not None:
                raise KeyError(missing_id)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise USNReadError("Не удалось получить данные тестового стенда USN") from error

    def _catalog(self, http: httpx.Client) -> Iterator[dict]:
        page = 1
        count = 0
        try:
            while True:
                payload = self._get(http, "competitions/", params={"page": page})
                rows = _items(payload)
                yield from rows
                count += len(rows)
                if not rows or not isinstance(payload, dict) or count >= payload["total_count"]:
                    return
                if payload["page"] != page:
                    raise ValueError("Unexpected catalog page")
                page += 1
        except (KeyError, ValueError, TypeError) as error:
            raise USNReadError("Стенд USN вернул неожиданный формат списка соревнований") from error

    def list_competitions(self) -> list[Competition]:
        with httpx.Client(**self._http_options) as http:
            try:
                return [_competition(item) for item in self._catalog(http)]
            except (KeyError, ValueError, TypeError) as error:
                raise USNReadError("Стенд USN вернул неожиданный формат списка соревнований") from error

    def get_competition(self, competition_id: str) -> Competition:
        if not competition_id.isascii() or not competition_id.isdecimal():
            raise KeyError(competition_id)
        with httpx.Client(**self._http_options) as http:
            detail = self._get(http, f"competitions/{competition_id}/", missing_id=competition_id)
            catalog_item = next((item for item in self._catalog(http) if str(item.get("id")) == competition_id), None)
            if catalog_item is None:
                raise USNReadError("Соревнование отсутствует в списке USN: доступность ролей неизвестна")
            slots = self._get(http, "time-slots/", params={"competition_id": competition_id})
        try:
            competition = _competition({**catalog_item, **detail})
            games = _schedule(detail)
            blocks = sorted(
                (_slot(item, games) for item in _items(slots) if item["is_active"]),
                key=lambda block: block.start,
            )
            return competition.model_copy(update={"availability_blocks": blocks, "games": games})
        except (KeyError, ValueError, TypeError, AttributeError) as error:
            raise USNReadError("Стенд USN вернул неожиданный формат карточки или слотов") from error
