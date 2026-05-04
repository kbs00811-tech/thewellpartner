"""
더웰파트너 처리 API — FastAPI 진입점
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import attendance

app = FastAPI(
    title="더웰파트너 처리 API",
    description="PDF 출근부 → 청구 엑셀 자동 입력 (수식/서식 보존)",
    version="1.0.0",
)

# CORS — 환경변수로 허용 도메인 설정
allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "https://thewellpartner.com,https://www.thewellpartner.com,https://thewellpartner.vercel.app,http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins if o.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Admin-Token", "Authorization"],
    expose_headers=["X-Process-Result", "Content-Disposition"],
)


@app.get("/")
async def root():
    return {
        "service": "thewellpartner-api",
        "status": "ok",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(attendance.router)
