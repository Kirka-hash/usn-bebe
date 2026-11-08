"""Вход участников по email с одноразовым кодом (подтверждено заказчиком 08.11.2026).

В API USN авторизации пользователей нет — делаем на своей стороне.
ЗАГЛУШКА: коды и сессии в памяти, письмо — через LogNotificationService.
"""
from __future__ import annotations

import secrets

from backend.notifications.service import NotificationService


class EmailCodeAuth:
    def __init__(self, notifier: NotificationService):
        self.notifier = notifier
        self._codes: dict[str, str] = {}
        self._sessions: dict[str, str] = {}

    def request_code(self, email: str) -> None:
        code = f"{secrets.randbelow(10**6):06d}"
        self._codes[email.lower()] = code
        self.notifier.send(email, "Код входа USN", f"Ваш код: {code}")

    def verify(self, email: str, code: str) -> str | None:
        if self._codes.get(email.lower()) != code:
            return None
        del self._codes[email.lower()]
        token = secrets.token_urlsafe(24)
        self._sessions[token] = email.lower()
        return token

    def user_email(self, token: str) -> str | None:
        return self._sessions.get(token)
