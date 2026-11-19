from fastapi.testclient import TestClient

from backend.api import routes
from backend.api.auth import EmailCodeAuth, OrganizerAuth
from backend.config import settings
from backend.integrations.usn.client import MockUSNClient
from backend.judging.review import REVIEW_ID
from backend.main import app
from backend.notifications.service import LogNotificationService
from backend.registration.service import RegistrationService


def test_review_tournament_from_live_registration_to_resolved_deficit(monkeypatch):
    from dataclasses import replace
    from backend import config

    store = MockUSNClient(review_demo=True)
    notifier = LogNotificationService()
    monkeypatch.setattr(config, "settings", replace(settings, review_demo=True, usn_mode="mock"))
    monkeypatch.setattr(routes, "usn", store)
    monkeypatch.setattr(routes, "registration", RegistrationService(store))
    monkeypatch.setattr(routes, "auth", EmailCodeAuth(notifier))
    organizer = OrganizerAuth("organizer@example.test", "review-test")
    monkeypatch.setattr(routes, "organizer_auth", organizer)
    headers = {"Authorization": f"Bearer {organizer.login('organizer@example.test', 'review-test')}"}
    url = f"/api/organizer/competitions/{REVIEW_ID}"
    with TestClient(app) as client:
        before = client.get(f"{url}/review", headers=headers).json()
        assert len(before["plans"]) == 28
        assert [(i["game_id"], i["needed"]) for i in before["issues"]] == [("d28", 2)]
        assert len(client.get(f"{url}/applications", headers=headers).json()) == 44
        for role in ("player", "voter"):
            email = f"live-{role}@example.test"
            client.post("/api/auth/request-code", json={"email": email})
            code = notifier.sent[-1][2].split()[-1]
            session = client.post("/api/auth/verify", json={"email": email, "code": code}).json()
            response = client.post("/api/applications", headers={"Authorization": f"Bearer {session['token']}"},
                json={"competition_id": REVIEW_ID, "role": role,
                      "profile": {"user_id": session["user_id"], "email": email, "first_name": "Антон",
                                  "last_name": "Примеров", "country": "Россия", "city": "Дубна"},
                      "availability_block_ids": ["b1"] if role == "voter" else [],
                      "consents": {"rules": True, "pd": True, "media": True}})
            assert response.status_code == 200
            assert any(row["id"] == response.json()["id"]
                       for row in client.get(f"{url}/applications", headers=headers).json())
        assert client.post(f"{url}/review/d28/apply").status_code == 401
        result = client.post(f"{url}/review/d28/apply", headers=headers)
        assert result.status_code == 200
        assert not result.json()["issues"]
        assert all(p["complete"] and p["proposal"]["reserve"] for p in result.json()["plans"])
        assert client.post(f"{url}/review/d28/apply", headers=headers).json() == result.json()
