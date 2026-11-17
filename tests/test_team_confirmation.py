"""Командный формат: второй игрок подтверждает, что он участник команды (заказчик, 17.11)."""
import pytest

from backend.registration.models import TeamStatus
from backend.registration.rules import RuleViolation
from conftest import make

TEAM = "cup-coop-team"


def player(service, user, partner=None):
    return service.submit(make(user=user, comp=TEAM, partner_user_id=partner))


def status(service, user):
    return service._player_app(user, TEAM).team_status


def test_partner_not_registered_yet_team_awaits(service):
    a = player(service, "A", partner="B")
    assert a.team_status == TeamStatus.AWAITING
    assert [x.profile.user_id for x in service.team_invitations("B", TEAM)] == ["A"]


def test_partner_registers_choosing_inviter_confirms_both(service):
    player(service, "A", partner="B")
    b = player(service, "B", partner="A")
    assert b.team_status == TeamStatus.CONFIRMED
    assert status(service, "A") == TeamStatus.CONFIRMED
    assert service.team_invitations("B", TEAM) == []


def test_registered_partner_confirms_invitation(service):
    player(service, "B")                      # Б уже зарегистрирован без напарника
    player(service, "A", partner="B")
    b = service.confirm_team(TEAM, "B", "A")
    assert b.partner_user_id == "A" and b.team_status == TeamStatus.CONFIRMED
    assert status(service, "A") == TeamStatus.CONFIRMED


def test_confirm_requires_own_registration(service):
    player(service, "A", partner="B")
    with pytest.raises(RuleViolation) as e:
        service.confirm_team(TEAM, "B", "A")
    assert e.value.code == "register_first"


def test_partner_declines_inviter_must_choose_another(service):
    player(service, "A", partner="B")
    service.decline_team(TEAM, "B", "A")
    assert status(service, "A") == TeamStatus.DECLINED
    assert service.team_invitations("B", TEAM) == []


def test_cannot_pick_player_already_in_confirmed_team(service):
    player(service, "A", partner="B")
    player(service, "B", partner="A")
    with pytest.raises(RuleViolation) as e:
        player(service, "C", partner="B")
    assert e.value.code == "partner_taken"


def test_changing_partner_releases_previous_one(service):
    player(service, "A", partner="B")
    player(service, "B", partner="A")
    player(service, "A", partner="C")          # А передумал
    assert status(service, "A") == TeamStatus.AWAITING
    assert status(service, "B") == TeamStatus.DECLINED


def test_individual_format_has_no_team_status(service):
    app = service.submit(make(user="X"))
    assert app.team_status is None
