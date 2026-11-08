"""Smoke: приложение поднимается и отвечает."""
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_competitions_only_with_open_roles():
    data = client.get("/api/competitions").json()
    assert {c["id"] for c in data} >= {"cup-challenge-classic", "cup-strategy-express"}


def test_email_code_login_flow():
    from backend.api.deps import notifier

    client.post("/api/auth/request-code", json={"email": "a@example.com"})
    code = notifier.sent[-1][2].split()[-1]
    r = client.post("/api/auth/verify", json={"email": "a@example.com", "code": code})
    assert r.status_code == 200 and r.json()["token"]
    assert client.post("/api/auth/verify", json={"email": "a@example.com", "code": code}).status_code == 401
