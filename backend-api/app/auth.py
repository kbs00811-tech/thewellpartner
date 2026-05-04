"""
어드민 토큰 검증 — Supabase Edge Function의 X-Admin-Token 패턴과 동일
"""
import os
from typing import Optional
from fastapi import HTTPException


def verify_admin_token(x_admin_token: Optional[str], authorization: Optional[str]) -> None:
    """
    환경변수 ADMIN_API_TOKEN이 설정되어 있으면 일치 여부 검증.
    설정되지 않았으면 (개발 모드) 통과.

    토큰은 X-Admin-Token 헤더 우선, 없으면 Authorization Bearer 토큰.
    """
    expected = os.environ.get("ADMIN_API_TOKEN", "").strip()
    if not expected:
        # 개발/로컬 모드: 토큰 미설정 시 통과
        return

    provided = (x_admin_token or "").strip()
    if not provided and authorization:
        # "Bearer xxx" 형태에서 추출
        parts = authorization.split(maxsplit=1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            provided = parts[1].strip()

    if provided != expected:
        raise HTTPException(401, "유효하지 않은 관리자 토큰입니다.")
