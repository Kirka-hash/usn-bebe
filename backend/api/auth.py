"""Вход участников по email с одноразовым кодом (подтверждено заказчиком 08.11.2026).

В API USN авторизации пользователей нет — делаем на своей стороне.
ЗАГЛУШКА: коды и сессии в памяти, письмо — через LogNotificationService.
"""
from __future__ import annotations

import secrets
import uuid

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

    def logout(self, token: str) -> None:
        self._sessions.pop(token, None)

    @staticmethod
    def user_id(email: str) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f"usn-email:{email.strip().lower()}"))


class OrganizerAuth:
    """Отдельные сессии организатора для прототипа."""

    def __init__(self, email: str, password: str):
        self.email = email.strip().lower()
        self._password = password.encode()
        self._sessions: set[str] = set()

    def login(self, email: str, password: str) -> str | None:
        if not self._password or email.strip().lower() != self.email:
            return None
        if not secrets.compare_digest(password.encode(), self._password):
            return None
        token = secrets.token_urlsafe(32)
        self._sessions.add(token)
        return token

    def accepts(self, token: str) -> bool:
        return token in self._sessions

    def logout(self, token: str) -> None:
        self._sessions.discard(token)
