"""ИИ-помощник: объяснения, варианты закрытия дефицита (задача «Б»), тексты приглашений.

ЗАГЛУШКА: сейчас объяснения собираются по шаблону из причин алгоритма.
В спринте 3 — вызов LLM только с обезличенными данными (Anonymizer).
"""
from __future__ import annotations

from backend.judging.collegia import Collegium, PanelProposal

TITLES = {
    Collegium.HIRING: "Нанимающиеся на работу",
    Collegium.SENDING: "Отправляющие на переговоры",
    Collegium.OWNERSHIP: "Доверяющие собственность",
    Collegium.EXPRESS: "Отправляющие на переговоры (экспресс)",
}


def explain(proposal: PanelProposal) -> list[str]:
    """Короткое объяснение по каждому назначению — без перегруза организатора."""
    return [f"{a.judge_id} → «{TITLES[a.collegium]}»: " + ", ".join(a.reasons) for a in proposal.assignments]


def deficit_options(proposal: PanelProposal) -> list[str]:
    """Варианты закрытия дефицита (экран O5). Порядок — по ТЗ 6.1.3.

    Сокращать состав ИИ не предлагает: количество судей задано регламентом (заказчик, 10.11).
    В классике и командах один резервный судья может судить за недостающие коллегии.
    """
    if proposal.complete:
        return []
    options = [
        "А: попросить судей соседнего блока прийти раньше или задержаться",
        "Б: пригласить опытных судей, которые ещё не зарегистрировались",
    ]
    if proposal.panel_size in (7, 9):
        options.append("В: резервный судья судит за недостающую коллегию (классика и командные поединки)")
    return options


def invitation_text(collegium: Collegium, when: str, competition: str) -> str:
    return (
        f"Добрый день! {when} на турнире «{competition}» не хватает судей в коллегии "
        f"«{TITLES[collegium]}». Сможете ли вы помочь? Будем очень благодарны!"
    )
