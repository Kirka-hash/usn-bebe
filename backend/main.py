"""Точка входа: uvicorn backend.main:app --reload"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router
from backend.integrations.usn.http_reader import USNReadError

app = FastAPI(
    title="USN · регистрация и координация судей (команда «бебе»)",
    version="0.1.0",
    description="Скелет решения, спринт 3. Каталог USN — демо или чтение со стенда.",
)
# Фронтенд в разработке живёт на другом порту (Vite — 5173, CRA — 3000).
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(USNReadError)
async def usn_read_error(_request: Request, error: USNReadError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": str(error)})


app.include_router(router, prefix="/api")
