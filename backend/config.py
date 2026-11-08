"""Конфигурация из переменных окружения (см. .env.example)."""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    usn_mode: str = os.getenv("USN_MODE", "mock")
    usn_api_url: str = os.getenv("USN_API_URL", "")
    usn_api_user: str = os.getenv("USN_API_USER", "")
    usn_api_password: str = os.getenv("USN_API_PASSWORD", "")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    database_url: str = os.getenv("DATABASE_URL", "")


settings = Settings()
