"""Данные, которые нужны фронтенду при регистрации и ответе на приглашение."""
from backend.integrations.usn.client import MockUSNClient
from backend.registration.models import ApplicationIn, ApplicationStatus, Profile, Role
from backend.registration.service import RegistrationService


def test_profile_player_search_and_withdraw():
    usn = MockUSNClient()
    registration = RegistrationService(usn)
    profile = Profile(user_id="player-1", email="p@example.com", last_name="Петров",
                      first_name="Илья", country="Россия", city="Москва", phone="+79990000000")
    usn.save_profile(profile)
    assert usn.get_profile("player-1") == profile
    assert usn.list_players("Петров") == []  # профиль без заявки ещё не игрок

    app = registration.submit(ApplicationIn(
        competition_id="cup-coop-team", role=Role.PLAYER, profile=profile,
        consents={"rules": True, "pd": True, "media": True},
    ))
    assert [p.user_id for p in usn.list_players("Петров")] == ["player-1"]
    assert usn.list_players("Сидоров") == []

    withdrawn = registration.withdraw(app.id, "player-1")
    assert withdrawn.status == ApplicationStatus.WITHDRAWN
    assert usn.list_players("Петров") == []
