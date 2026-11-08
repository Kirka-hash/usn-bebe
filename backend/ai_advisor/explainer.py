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
}


def explain(proposal: PanelProposal) -> list[str]:
    """Короткое объяснение по каждому назначению — без перегруза организатора."""
    return [f"{a.judge_id} → «{TITLES[a.collegium]}»: " + ", ".join(a.reasons) for a in proposal.assignments]


def deficit_options(proposal: PanelProposal) -> list[str]:
    """Варианты закрытия дефицита (экран O5). Порядок — по ТЗ 6.1.3 и Правилам 9.7/9.9."""
    if proposal.complete:
        return []
    options = [
        "А: попросить судей соседнего блока прийти раньше или задержаться",
        "Б: пригласить опытных судей, которые ещё не зарегистрировались",
    ]
    if proposal.panel_size == 9:
        options.append("В: уменьшить состав до 7 (2/3/2) на весь турнир — допускается правилом 9.7")
    if proposal.reserve:
        options.append("Г: поставить резервного судью, он голосует от недостающей коллегии (правило 9.9)")
    return options


def invitation_text(collegium: Collegium, when: str, competition: str) -> str:
    return (
        f"Добрый день! {when} на турнире «{competition}» не хватает судей в коллегии "
        f"«{TITLES[collegium]}». Сможете ли вы помочь? Будем очень благодарны!"
    )
