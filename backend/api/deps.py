"""Сборка зависимостей. USN_MODE=mock (по умолчанию) или http (заглушка до доступа к стенду)."""
from __future__ import annotations

from backend.config import settings
from backend.integrations.usn.client import HttpUSNClient, MockUSNClient
from backend.notifications.service import LogNotificationService
from backend.registration.service import RegistrationService

from .auth import EmailCodeAuth

usn = (
    HttpUSNClient(settings.usn_api_url, settings.usn_api_user, settings.usn_api_password)
    if settings.usn_mode == "http"
    else MockUSNClient()
)
notifier = LogNotificationService()
auth = EmailCodeAuth(notifier)
registration = RegistrationService(usn)
