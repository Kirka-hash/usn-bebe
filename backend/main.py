"""Точка входа: uvicorn backend.main:app --reload"""
from fastapi import FastAPI

from backend.api.routes import router

app = FastAPI(
    title="USN · регистрация и координация судей (команда «бебе»)",
    version="0.1.0",
    description="Скелет решения, спринт 2. Интеграция с USN — mock до доступа к стенду.",
)
app.include_router(router, prefix="/api")
