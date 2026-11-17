"""Smoke: приложение поднимается и отвечает."""
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_competitions_only_with_open_roles():
    data = client.get("/api/competitions").json()
    assert {c["id"] for c in data} >= {"cup-challenge-classic", "cup-strategy-express"}


def test_competition_card_and_my_applications():
    assert client.get("/api/competitions/cup-challenge-classic").json()["format"] == "classic"
    assert client.get("/api/competitions/nope").status_code == 404
    body = {"competition_id": "cup-challenge-classic", "role": "viewer",
            "profile": {"user_id": "smoke-u", "email": "s@example.com", "last_name": "Тест",
                        "first_name": "Тест", "country": "Россия", "city": "Москва"},
            "consents": {"rules": True, "pd": True, "media": True}}
    assert client.post("/api/applications", json=body).status_code == 200
    mine = client.get("/api/users/smoke-u/applications").json()
    assert len(mine) == 1 and mine[0]["role"] == "viewer"


def test_email_code_login_flow():
    from backend.api.deps import notifier

    client.post("/api/auth/request-code", json={"email": "a@example.com"})
    code = notifier.sent[-1][2].split()[-1]
    r = client.post("/api/auth/verify", json={"email": "a@example.com", "code": code})
    assert r.status_code == 200 and r.json()["token"]
    assert client.post("/api/auth/verify", json={"email": "a@example.com", "code": code}).status_code == 401
