import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.integrations.usn.client import MockUSNClient  # noqa: E402
from backend.registration.models import ApplicationIn, Profile, Role  # noqa: E402
from backend.registration.service import RegistrationService  # noqa: E402

CONSENTS = {"rules": True, "pd": True, "media": True}


@pytest.fixture
def service():
    return RegistrationService(MockUSNClient())


def make(user="u1", comp="cup-challenge-classic", role=Role.PLAYER, **kw):
    profile = Profile(user_id=user, email=f"{user}@example.com", last_name="Иванов",
                      first_name="Пётр", country="Россия", city="Екатеринбург")
    return ApplicationIn(competition_id=comp, role=role, profile=profile, consents=CONSENTS, **kw)
