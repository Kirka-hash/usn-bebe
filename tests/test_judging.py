"""Коллегии, карта доступности, анонимизация."""
from backend.ai_advisor.anonymizer import Anonymizer
from backend.ai_advisor.explainer import deficit_options, explain
from backend.judging.availability import availability_map
from backend.judging.collegia import Collegium, JudgeCandidate, propose_panel
from backend.registration.models import Role

H, S, O = Collegium.HIRING, Collegium.SENDING, Collegium.OWNERSHIP


def judge(i, h, s, o, club=""):
    return JudgeCandidate(judge_id=f"JUDGE_{i:03d}", scores={H: h, S: s, O: o}, club=club)


def test_full_panel_puts_judges_in_strongest_collegium():
    pool = [judge(i, 3, 1, 1) for i in range(3)] + [judge(i, 1, 3, 1) for i in range(3, 6)] \
        + [judge(i, 1, 1, 3) for i in range(6, 9)] + [judge(9, 2, 2, 2)]
    p = propose_panel(pool, 9, 1)
    assert p.complete
    assert all(a.score == 3 for a in p.assignments)
    assert p.reserve == ["JUDGE_009"]
    assert len(explain(p)) == 9


def test_seven_judge_composition():
    pool = [judge(i, 2, 2, 2) for i in range(7)]
    p = propose_panel(pool, 7, 0)
    counts = {c: sum(a.collegium == c for a in p.assignments) for c in (H, S, O)}
    assert counts == {H: 2, S: 3, O: 2}


def test_deficit_options_never_reduce_panel():
    """Состав задан регламентом — ИИ не предлагает его сокращать (заказчик, 10.11)."""
    p = propose_panel([judge(i, 2, 2, 2) for i in range(5)], 9, 3)
    assert not p.complete and sum(p.missing.values()) == 4
    opts = deficit_options(p)
    assert not any("7" in o or "уменьш" in o.lower() for o in opts)
    assert any("резервный судья" in o for o in opts)


def test_express_uses_hard_negotiation_score():
    """Экспресс: 5 судей, балл — столбец «жёсткие переговоры» (заказчик, 10.11)."""
    pool = [JudgeCandidate(judge_id=f"JUDGE_{i:03d}", scores={S: 3, Collegium.EXPRESS: 1 + (i % 3)}) for i in range(8)]
    p = propose_panel(pool, 5, 1)
    assert p.complete and all(a.collegium == Collegium.EXPRESS for a in p.assignments)
    assert sorted(a.score for a in p.assignments)[0] >= 2


def test_conflict_of_interest_by_school_excluded_usn_neutral():
    """Тренер–ученик определяется по названию школы; общая принадлежность к USN — не конфликт."""
    pool = [judge(1, 3, 3, 3, club="СразуДа"), judge(2, 2, 2, 2, club="Универсальная школа переговоров")]
    p = propose_panel(pool, 9, 0, conflict_clubs={"сразуда", "Универсальная школа переговоров"})
    assert [a.judge_id for a in p.assignments] == ["JUDGE_002"]


def test_availability_map_states(service):
    from conftest import make

    for i in range(10):
        service.submit(make(user=f"j{i}", role=Role.VOTER, availability_block_ids=["b1"] if i < 10 else []))
    for i in range(10, 19):
        service.submit(make(user=f"j{i}", role=Role.VOTER, availability_block_ids=["b2"]))
    comp = service.usn.get_competition("cup-challenge-classic")
    states = {b.block_id: b.state for b in availability_map(comp, service.usn.list_applications(comp.id), 9, 3)}
    assert states == {"b1": "no_reserve", "b2": "no_reserve", "b3": "deficit"}


def test_anonymizer_removes_pd():
    a = Anonymizer()
    tok = a.token("Иванов Пётр")
    text = a.anonymize("Иванов Пётр (ivanov@mail.ru, @ivanov) свободен")
    assert "Иванов" not in text and "@mail" not in text and "@ivanov" not in text
    assert tok in text
    assert a.restore(tok) == "Иванов Пётр"
