"""
더웰파트너 처리 API — FastAPI 진입점
"""
import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .routers import attendance, payslip

app = FastAPI(
    title="더웰파트너 처리 API",
    description="PDF 출근부 → 청구 엑셀 자동 입력 (수식/서식 보존)",
    version="1.0.0",
)

# CORS — 환경변수로 허용 도메인 설정
allowed_origins_raw = os.environ.get(
    "ALLOWED_ORIGINS",
    "https://thewellpartner.com,https://www.thewellpartner.com,https://thewellpartner.vercel.app,http://localhost:5173,http://localhost:3000",
)
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in allowed_origins_raw.split(",") if o.strip()]
# 메인 도메인 안전망 (환경변수 누락 방어)
for must in ("https://thewellpartner.com", "https://www.thewellpartner.com"):
    if must not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(must)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Admin-Token", "Authorization", "Accept"],
    expose_headers=["X-Process-Result", "Content-Disposition"],
)


def _add_cors_headers_if_needed(request: Request, response):
    """
    응답에 CORS 헤더가 빠져 있으면 강제로 추가.
    500/예외 응답은 starlette CORSMiddleware가 헤더를 안 붙이는 경우가 있어
    브라우저가 "CORS 에러"로 잘못 표시하는 문제를 방지.
    """
    origin = request.headers.get("origin", "")
    if origin and origin in ALLOWED_ORIGINS:
        if "access-control-allow-origin" not in {k.lower() for k in response.headers.keys()}:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """HTTPException 응답에도 CORS 헤더 강제 추가"""
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )
    return _add_cors_headers_if_needed(request, response)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    잡히지 않은 예외 → 500 응답.
    CORS 헤더 + 트레이스백을 응답에 포함해서 브라우저에서 진짜 에러 메시지 확인 가능하게.
    """
    tb = traceback.format_exc()
    response = JSONResponse(
        status_code=500,
        content={
            "detail": f"서버 오류: {type(exc).__name__}: {str(exc)}",
            "traceback": tb[-2000:],  # 너무 길지 않게
        },
    )
    return _add_cors_headers_if_needed(request, response)


@app.get("/")
async def root():
    return {
        "service": "thewellpartner-api",
        "status": "ok",
        "version": "1.0.0",
        "cors_origins": ALLOWED_ORIGINS,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(attendance.router)
app.include_router(payslip.router)
