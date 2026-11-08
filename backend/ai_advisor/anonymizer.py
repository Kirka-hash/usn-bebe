"""Шлюз анонимизации ПДн перед любым обращением к внешней LLM (ADR-0003, H-07).

В LLM уходят только токены JUDGE_xxx / PLAYER_xxx. Таблица соответствия хранится
локально (в спринте 3 — в PostgreSQL), наружу не передаётся.
"""
from __future__ import annotations

import re


class Anonymizer:
    def __init__(self):
        self._to_token: dict[str, str] = {}
        self._to_real: dict[str, str] = {}
        self._counters = {"JUDGE": 0, "PLAYER": 0}

    def token(self, real_name: str, kind: str = "JUDGE") -> str:
        if real_name not in self._to_token:
            self._counters[kind] += 1
            tok = f"{kind}_{self._counters[kind]:03d}"
            self._to_token[real_name] = tok
            self._to_real[tok] = real_name
        return self._to_token[real_name]

    def anonymize(self, text: str) -> str:
        for real, tok in sorted(self._to_token.items(), key=lambda kv: -len(kv[0])):
            text = text.replace(real, tok)
        text = re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", "[email]", text)
        text = re.sub(r"(?<!\w)@\w{3,}", "[telegram]", text)
        return text

    def restore(self, text: str) -> str:
        return re.sub(r"(JUDGE|PLAYER)_\d{3}", lambda m: self._to_real.get(m.group(0), m.group(0)), text)
