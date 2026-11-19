"""Smoke: приложение поднимается и отвечает."""
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_competitions_only_with_open_roles():
    data = client.get("/api/competitions").json()
    assert {c["id"] for c in data} >= {"cup-challenge-classic", "cup-strategy-express"}


def sign_in(email):
    from backend.api.deps import notifier

    assert client.post("/api/auth/request-code", json={"email": email}).status_code == 200
    code = notifier.sent[-1][2].split()[-1]
    data = client.post("/api/auth/verify", json={"email": email, "code": code}).json()
    return data["user_id"], {"Authorization": f"Bearer {data['token']}"}


def test_card_access_and_application_lifecycle(monkeypatch):
    from backend.api import routes
    from backend.api.auth import OrganizerAuth

    monkeypatch.setattr(routes, "organizer_auth", OrganizerAuth("staff@example.test", "test-password"))
    competition = "cup-challenge-classic"
    assert client.get(f"/api/competitions/{competition}").json()["format"] == "classic"
    assert client.get("/api/competitions/nope").status_code == 404
    user_id, participant = sign_in("lifecycle@example.test")
    mine = f"/api/users/{user_id}/applications"
    body = {"competition_id": competition, "role": "viewer",
            "profile": {"user_id": "ignored", "email": "ignored@example.test", "last_name": "Тест",
                        "first_name": "Тест", "country": "Россия", "city": "Москва",
                        "phone": "+70000000000", "telegram": "@example"},
            "consents": {"rules": True, "pd": True, "media": True}}
    saved = client.post("/api/applications", json=body, headers=participant)
    assert saved.status_code == 200
    application_id = saved.json()["id"]
    entries = f"/api/organizer/competitions/{competition}/applications"
    status = f"/api/organizer/applications/{application_id}/status?status=confirmed"
    for headers in ({}, participant, {"Authorization": "Bearer true"}):
        assert client.get(entries, headers=headers).status_code == 401
        assert client.post(status, headers=headers).status_code == 401
    assert client.get(mine).status_code == 401
    _, other = sign_in("unrelated@example.test")
    assert client.get(mine, headers=other).status_code == 403

    org_login = client.post("/api/organizer/login", json={"email": "staff@example.test", "password": "test-password"})
    assert org_login.status_code == 200
    organizer = {"Authorization": f"Bearer {org_login.json()['token']}"}
    entry = next(a for a in client.get(entries, headers=organizer).json() if a["id"] == application_id)
    assert entry["profile"]["phone"] == "+70000000000"
    assert entry["profile"]["telegram"] == "@example"
    assert entry["profile"]["email"] == "lifecycle@example.test"
    assert client.post("/api/organizer/logout", headers=organizer).status_code == 200
    assert client.get(entries, headers=organizer).status_code == 401

    assert client.post("/api/auth/logout", headers=participant).status_code == 200
    assert client.get(mine, headers=participant).status_code == 401
    same_id, renewed = sign_in("lifecycle@example.test")
    assert same_id == user_id
    assert [a["id"] for a in client.get(mine, headers=renewed).json()] == [application_id]
    body["profile"]["city"] = "Дубна"
    assert client.post("/api/applications", json=body, headers=renewed).json()["id"] == application_id
    [edited] = client.get(mine, headers=renewed).json()
    assert edited["profile"]["city"] == "Дубна"
    withdrawn = client.post(f"/api/applications/{application_id}/withdraw", headers=renewed)
    assert withdrawn.status_code == 200 and withdrawn.json()["status"] == "withdrawn"


def test_email_code_login_flow():
    from backend.api.deps import notifier

    client.post("/api/auth/request-code", json={"email": "a@example.com"})
    code = notifier.sent[-1][2].split()[-1]
    r = client.post("/api/auth/verify", json={"email": "a@example.com", "code": code})
    assert r.status_code == 200 and r.json()["token"]
    assert client.post("/api/auth/verify", json={"email": "a@example.com", "code": code}).status_code == 401
