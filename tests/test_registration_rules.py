"""Пограничные случаи регистрации (бриф v2, раздел 08; замечания заказчика 26.10)."""
from datetime import datetime, timezone

import pytest

from backend.registration.models import ApplicationStatus, Role
from backend.registration.rules import RuleViolation
from conftest import make


def test_repeat_registration_updates_not_duplicates(service):
    a1 = service.submit(make())
    again = make()
    again.profile.city = "Минск"
    a2 = service.submit(again)
    assert a1.id == a2.id
    assert len(service.find_existing("u1", "cup-challenge-classic")) == 1
    assert a2.profile.city == "Минск"


def test_player_plus_adviser_allowed(service):
    service.submit(make(user="p2"))
    service.submit(make(user="u1"))
    adv = service.submit(make(user="u1", role=Role.ADVISER, advised_player_ids=["p2"]))
    assert {a.role for a in service.find_existing("u1", "cup-challenge-classic")} == {Role.PLAYER, Role.ADVISER}
    assert adv.status == ApplicationStatus.RECEIVED


def test_other_combinations_forbidden(service):
    service.submit(make(user="u1"))
    with pytest.raises(RuleViolation) as e:
        service.submit(make(user="u1", role=Role.VOTER, availability_block_ids=["b1"]))
    assert e.value.code == "role_unavailable"


def test_one_adviser_several_players(service):
    for p in ("p1", "p2"):
        service.submit(make(user=p))
    adv = service.submit(make(user="a1", role=Role.ADVISER, advised_player_ids=["p1", "p2"]))
    assert adv.advised_player_ids == ["p1", "p2"]


def test_adviser_cannot_advise_self(service):
    service.submit(make(user="u1"))
    with pytest.raises(RuleViolation) as e:
        service.submit(make(user="u1", role=Role.ADVISER, advised_player_ids=["u1"]))
    assert e.value.code == "adviser_self"


def test_adviser_only_in_classic(service):
    with pytest.raises(RuleViolation) as e:
        service.submit(make(comp="cup-coop-team", role=Role.ADVISER, advised_player_ids=["p1"]))
    assert "классических" in e.value.message


def test_closed_role_rejected(service):
    with pytest.raises(RuleViolation) as e:
        service.submit(make(comp="cup-strategy-express"))
    assert e.value.code == "role_unavailable"


def test_deadline_passed_rejected(service):
    late = datetime(2031, 1, 1, tzinfo=timezone.utc)
    with pytest.raises(RuleViolation):
        service.submit(make(), now=late)


def test_voter_needs_at_least_one_block(service):
    with pytest.raises(RuleViolation) as e:
        service.submit(make(user="j1", role=Role.VOTER))
    assert e.value.code == "voter_no_blocks"


def test_partner_only_in_team_format(service):
    with pytest.raises(RuleViolation) as e:
        service.submit(make(partner_user_id="p9"))
    assert e.value.code == "partner_not_team"
    ok = service.submit(make(comp="cup-coop-team", partner_user_id="p9"))
    assert ok.partner_user_id == "p9"


def test_confirmed_application_stays_editable_while_role_open(service):
    app = service.submit(make())
    service.set_status(app.id, ApplicationStatus.CONFIRMED)
    edited = service.submit(make())
    assert edited.id == app.id  # правило сброса статуса — вопрос заказчику (В-18)


def test_reserve_shown_to_participant_as_received(service):
    app = service.submit(make())
    reserved = service.set_status(app.id, ApplicationStatus.RESERVE)
    assert reserved.participant_status() == ApplicationStatus.RECEIVED


def test_missing_consents_rejected(service):
    data = make().model_copy(update={"consents": {"rules": True}})
    with pytest.raises(RuleViolation) as e:
        service.submit(data)
    assert e.value.code == "consents"
