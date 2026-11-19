from datetime import date, datetime, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.api import routes
from backend.integrations.usn.http_reader import HttpUSNClient
from backend.main import app
from backend.registration.models import CompetitionFormat, Profile


CATALOG_ITEM = {
    "id": 14, "name": "Экспресс", "competition_type": "quick", "player_entry_open": True,
    "voter_entry_open": True, "adviser_entry_open": False, "viewer_entry_open": False,
    "days": [{"date": "2030-03-21"}],
}


def make_client(handler):
    return HttpUSNClient("https://stand.example/api", "demo", "test", transport=httpx.MockTransport(handler))


def test_reads_catalog_schedule_and_slots_without_sending_profiles(monkeypatch):
    calls = []

    def stand(request):
        calls.append((request.method, request.url.path, request.url.params.get("competition_id")))
        assert request.headers["authorization"] == "Basic ZGVtbzp0ZXN0"
        if request.url.path == "/api/competitions/":
            return httpx.Response(200, json={"page": 1, "page_size": 10, "total_count": 1, "results": [CATALOG_ITEM]})
        if request.url.path == "/api/competitions/14/":
            return httpx.Response(200, json={"id": 14, "name": "Экспресс", "competition_type": "quick",
                "days": [{"id": 71, "date": "2030-03-21", "schedule_items": [
                {"item_type": "break", "start_time": "09:00:00", "game": None},
                {"item_type": "game", "start_time": "09:30:00", "end_time": "10:00:00",
                 "round_name": "Первый круг", "game": {
                    "id": 3, "players": [{"email": "private@example.test"}],
                }},
            ]}]})
        return httpx.Response(200, json=[{
            "id": 22, "slot_day": "2030-03-21", "is_active": True, "start_time": "09:00:00", "end_time": "11:00:00",
            "max_voters": 7, "assigned": 7, "available": 0,
        }])

    client = make_client(stand)
    [item] = client.list_competitions()
    assert item.format == CompetitionFormat.EXPRESS
    assert item.days == [date(2030, 3, 21)]
    assert item.deadlines == {}
    competition = client.get_competition("14")
    assert competition.open_roles["voter"] is True
    assert [(game.id, game.start) for game in competition.games] == [
        ("3", datetime(2030, 3, 21, 9, 30, tzinfo=timezone.utc))
    ]
    [block] = competition.availability_blocks
    assert (block.id, block.title, block.available, block.assigned, block.max_voters) == ("22", "Первый круг", 0, 7, 7)
    assert "private@example.test" not in competition.model_dump_json()
    profile = Profile(user_id="demo", email="demo@example.test")
    client.save_profile(profile)
    assert client.get_profile("demo") == profile
    assert calls == [
        ("GET", "/api/competitions/", None), ("GET", "/api/competitions/14/", None),
        ("GET", "/api/competitions/", None), ("GET", "/api/time-slots/", "14"),
    ]

    monkeypatch.setattr(routes, "usn", client)
    response = TestClient(app).get("/api/competitions/14")
    assert response.status_code == 200
    card = response.json()
    assert card["open_roles"]["voter"]
    assert [game["id"] for game in card["games"]] == ["3"]
    assert [block["id"] for block in card["availability_blocks"]] == ["22"]


def test_catalog_reads_later_pages():
    def stand(request):
        page = int(request.url.params["page"])
        return httpx.Response(200, json={
            "page": page, "total_count": 2,
            "results": [{**CATALOG_ITEM, "id": page}],
        })

    assert [item.id for item in make_client(stand).list_competitions()] == ["1", "2"]


@pytest.mark.parametrize("upstream_status, expected", [(404, 404), (401, 502), (503, 502)])
def test_maps_stand_errors_in_api(monkeypatch, upstream_status, expected):
    monkeypatch.setattr(routes, "usn", make_client(lambda request: httpx.Response(upstream_status)))
    response = TestClient(app).get("/api/competitions/14")
    assert response.status_code == expected
