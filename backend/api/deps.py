"""Сборка зависимостей. USN_MODE=mock (по умолчанию) или http (каталог со стенда, заявки локально)."""
from __future__ import annotations

from backend.config import settings
from backend.integrations.usn.client import MockUSNClient
from backend.integrations.usn.http_reader import HttpUSNClient
from backend.notifications.service import LogNotificationService
from backend.registration.service import RegistrationService

from .auth import EmailCodeAuth, OrganizerAuth

usn = (
    HttpUSNClient(settings.usn_api_url, settings.usn_api_user, settings.usn_api_password)
    if settings.usn_mode == "http"
    else MockUSNClient(review_demo=settings.review_demo)
)
notifier = LogNotificationService()
auth = EmailCodeAuth(notifier)
organizer_auth = OrganizerAuth(settings.organizer_email, settings.organizer_password)
registration = RegistrationService(usn)
