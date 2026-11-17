"""Точка входа: uvicorn backend.main:app --reload"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router

app = FastAPI(
    title="USN · регистрация и координация судей (команда «бебе»)",
    version="0.1.0",
    description="Скелет решения, спринт 3. Интеграция с USN — mock до подключения dev-стенда.",
)
# Фронтенд в разработке живёт на другом порту (Vite — 5173, CRA — 3000).
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api")
