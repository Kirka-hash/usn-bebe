"""Задел под рассылки до/после соревнований (ТЗ 6.2 — не входит в MVP).

Интерфейс есть, чтобы модули регистрации и судейства уже вызывали уведомления
(«заявка принята», код входа), а каналы (email, Telegram, VK) подключались позже.
"""
from __future__ import annotations

import logging
from typing import Protocol

log = logging.getLogger("notifications")


class NotificationService(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class LogNotificationService:
    """ЗАГЛУШКА: пишет сообщения в лог вместо отправки."""

    def __init__(self):
        self.sent: list[tuple[str, str, str]] = []

    def send(self, to: str, subject: str, body: str) -> None:
        self.sent.append((to, subject, body))
        log.info("notify %s: %s", to, subject)
