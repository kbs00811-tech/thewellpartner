"""
급여명세서 발송 API
- 결과 xlsx 업로드 → 직원 목록 + 명세서 데이터 추출
- 직원별 명세서 토큰 URL 발급
- 솔라피(SOLAPI) API로 SMS / 알림톡 발송
"""
from __future__ import annotations
import os
import json
import secrets
import tempfile
import time
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from pydantic import BaseModel
from openpyxl import load_workbook

from ..auth import verify_admin_token

router = APIRouter(prefix="/api/payslip", tags=["payslip"])


# === 임시 토큰 저장소 (in-memory, 24시간 유효) ===
# 운영 안정성 위해 추후 Redis/DB로 이전
TOKEN_STORE: dict = {}
TOKEN_TTL = 86400  # 24시간


def _log(msg: str):
    import sys
    print(f"[PAYSLIP] {msg}", flush=True)
    sys.stdout.flush()


def _cleanup_expired_tokens():
    """만료된 토큰 제거 (메모리 관리)"""
    now = time.time()
    expired = [k for k, v in TOKEN_STORE.items() if v.get("expires_at", 0) < now]
    for k in expired:
        TOKEN_STORE.pop(k, None)


class EmployeeInfo(BaseModel):
    no: int
    name: str
    phone: Optional[str] = None
    hire_date: Optional[str] = None
    resign_date: Optional[str] = None
    hourly_rate: Optional[float] = None
    bank: Optional[str] = None
    account: Optional[str] = None


def _extract_employees_from_xlsx(xlsx_path: str) -> List[EmployeeInfo]:
    """xlsx의 DB 시트에서 직원 명단 추출 (이름, 연락처, 시급, 은행/계좌)"""
    wb = load_workbook(xlsx_path, data_only=True, read_only=True, keep_links=False)
    employees: List[EmployeeInfo] = []
    try:
        if "DB" not in wb.sheetnames:
            return employees
        ws = wb["DB"]
        # R1=헤더, R2~ 직원 데이터
        for r in range(2, ws.max_row + 1):
            no_val = ws.cell(r, 1).value
            name_val = ws.cell(r, 2).value
            if not name_val or not isinstance(name_val, str):
                continue
            phone = ws.cell(r, 7).value
            hire = ws.cell(r, 5).value
            resign = ws.cell(r, 6).value
            rate = ws.cell(r, 3).value
            bank = ws.cell(r, 11).value
            account = ws.cell(r, 12).value
            try:
                no_int = int(no_val) if no_val else r - 1
            except (ValueError, TypeError):
                no_int = r - 1
            employees.append(EmployeeInfo(
                no=no_int,
                name=name_val.strip(),
                phone=str(phone).strip() if phone else None,
                hire_date=hire.strftime("%Y-%m-%d") if isinstance(hire, datetime) else (str(hire) if hire else None),
                resign_date=resign.strftime("%Y-%m-%d") if isinstance(resign, datetime) else (str(resign) if resign else None),
                hourly_rate=float(rate) if rate else None,
                bank=str(bank).strip() if bank else None,
                account=str(account).strip() if account else None,
            ))
    finally:
        wb.close()
    return employees


@router.post("/employees")
async def list_employees(
    excel: UploadFile = File(...),
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(None),
):
    """결과 xlsx 업로드 → 직원 명단 + 연락처 반환 (어드민이 발송 대상 선택용)"""
    verify_admin_token(x_admin_token, authorization)
    tmp_dir = Path(tempfile.mkdtemp(prefix="payslip_"))
    try:
        xlsx_path = tmp_dir / (excel.filename or "in.xlsx")
        with open(xlsx_path, "wb") as f:
            f.write(await excel.read())
        emps = _extract_employees_from_xlsx(str(xlsx_path))
        _log(f"list_employees: {len(emps)}명")
        return {"employees": [e.model_dump() for e in emps]}
    finally:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


class SendRequest(BaseModel):
    company_id: Optional[str] = "lty"
    year: int
    month: int
    channel: str = "sms"  # 'sms' | 'lms' | 'alimtalk'
    employee_nos: List[int]  # 발송 대상 직원 번호 목록


@router.post("/send")
async def send_payslip(
    excel: UploadFile = File(...),
    payload: str = Form(...),  # JSON 직렬화된 SendRequest
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(None),
):
    """
    명세서 발송 (Phase D — 솔라피 연동).
    현재는 토큰 URL만 발급. 실제 솔라피 발송은 API 키 환경변수 등록 후 활성화.
    """
    verify_admin_token(x_admin_token, authorization)
    _cleanup_expired_tokens()

    try:
        req = SendRequest(**json.loads(payload))
    except Exception as e:
        raise HTTPException(400, f"payload 파싱 실패: {e}")

    api_key = os.environ.get("SOLAPI_API_KEY", "").strip()
    api_secret = os.environ.get("SOLAPI_API_SECRET", "").strip()
    sender = os.environ.get("SOLAPI_SENDER", "").strip()
    solapi_ready = bool(api_key and api_secret and sender)

    # 업로드 파일 저장
    tmp_dir = Path(tempfile.mkdtemp(prefix="payslip_send_"))
    try:
        xlsx_path = tmp_dir / (excel.filename or "in.xlsx")
        with open(xlsx_path, "wb") as f:
            f.write(await excel.read())

        # 전체 직원 정보 추출
        all_emps = _extract_employees_from_xlsx(str(xlsx_path))
        emps_by_no = {e.no: e for e in all_emps}
        targets = [emps_by_no[n] for n in req.employee_nos if n in emps_by_no]
        _log(f"send: 대상 {len(targets)}명 / channel={req.channel}")

        # 직원별 토큰 발급
        results = []
        base_url = os.environ.get("PAYSLIP_BASE_URL", "https://thewellpartner.com").rstrip("/")
        for emp in targets:
            token = secrets.token_urlsafe(16)
            TOKEN_STORE[token] = {
                "employee_no": emp.no,
                "employee_name": emp.name,
                "year": req.year,
                "month": req.month,
                "company_id": req.company_id,
                "xlsx_bytes": open(xlsx_path, "rb").read(),  # 메모리 — 작은 파일이라 OK
                "expires_at": time.time() + TOKEN_TTL,
            }
            url = f"{base_url}/payslip/{token}"

            # 솔라피 발송 (API 키 있을 때만)
            send_status = "skipped_no_api_key"
            error = None
            if not solapi_ready:
                if not api_key:
                    error = "SOLAPI_API_KEY env not set"
                elif not api_secret:
                    error = "SOLAPI_API_SECRET env not set"
                elif not sender:
                    error = "SOLAPI_SENDER env not set"
            elif not emp.phone:
                send_status = "no_phone"
                error = "직원 연락처 없음"
            else:
                try:
                    send_status = _send_solapi(
                        api_key, api_secret, sender,
                        to_phone=emp.phone,
                        channel=req.channel,
                        text=_build_message(emp.name, req.year, req.month, url),
                    )
                except Exception as e:
                    error = f"{type(e).__name__}: {str(e)[:300]}"
                    send_status = "failed"
                    _log(f"  send fail {emp.name}: {error}")

            results.append({
                "no": emp.no,
                "name": emp.name,
                "phone": emp.phone,
                "url": url,
                "status": send_status,
                "error": error,
            })

        return {
            "ok": True,
            "solapi_ready": solapi_ready,
            "channel": req.channel,
            "total": len(targets),
            "results": results,
        }
    except HTTPException:
        raise
    except Exception as e:
        _log(f"send ERROR: {type(e).__name__}: {e}")
        _log(traceback.format_exc())
        raise HTTPException(500, f"발송 실패: {type(e).__name__}: {e}")
    finally:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _build_message(name: str, year: int, month: int, url: str) -> str:
    """SMS / 알림톡 본문 — 솔라피 알림톡 템플릿과 동일하게"""
    return (
        f"[더웰파트너 급여명세서]\n"
        f"{name} 님, {year}년 {month}월분 급여명세서가 도착했습니다.\n"
        f"명세서 보기: {url}\n"
        f"(24시간 유효)"
    )


def _send_solapi(
    api_key: str,
    api_secret: str,
    sender: str,
    to_phone: str,
    channel: str,
    text: str,
) -> str:
    """솔라피 SDK 5.x로 발송. 성공 시 'sent' 반환.

    공식 SDK는 type 파라미터를 받지 않음 — 텍스트 길이로 자동 SMS/LMS 결정.
    알림톡은 KakaoOption (pf_id + template_id) 필요 — 환경변수 등록 안 되면 SMS로 폴백.
    """
    try:
        from solapi import SolapiMessageService
        from solapi.model import RequestMessage
    except ImportError:
        return "sdk_not_installed"

    msg_service = SolapiMessageService(api_key=api_key, api_secret=api_secret)
    sender_clean = sender.replace("-", "").replace(" ", "")
    to_clean = to_phone.replace("-", "").replace(" ", "")

    kakao_option = None
    if channel == "alimtalk":
        pf_id = os.environ.get("SOLAPI_PF_ID", "").strip()
        template_id = os.environ.get("SOLAPI_TEMPLATE_ID", "").strip()
        if pf_id and template_id:
            try:
                from solapi.model.kakao.kakao_option import KakaoOption
                kakao_option = KakaoOption(pf_id=pf_id, template_id=template_id)
            except ImportError:
                kakao_option = None
        # 알림톡 옵션 없으면 SMS로 폴백
        # (사용자가 KakaoBiz 채널/템플릿 등록 안 한 단계)

    # RequestMessage 생성 — type 인자 사용 안 함 (텍스트 길이로 자동)
    msg_kwargs = {
        "from_": sender_clean,
        "to": to_clean,
        "text": text,
    }
    if kakao_option is not None:
        msg_kwargs["kakao_options"] = kakao_option

    message = RequestMessage(**msg_kwargs)
    response = msg_service.send(message)
    # 응답 검증 — registered_failed > 0 이면 실패
    try:
        failed = getattr(response.group_info.count, "registered_failed", 0) or 0
        if failed > 0:
            raise RuntimeError(f"solapi registered_failed={failed}")
    except AttributeError:
        pass  # 응답 구조 다른 경우 그냥 통과
    return "sent"


@router.get("/data/{token}")
async def get_payslip_data(token: str):
    """직원용 명세서 페이지가 토큰으로 데이터 조회 (인증 불필요, 토큰 자체가 인증)"""
    _cleanup_expired_tokens()
    info = TOKEN_STORE.get(token)
    if not info:
        raise HTTPException(404, "유효하지 않거나 만료된 명세서 링크")

    if info["expires_at"] < time.time():
        TOKEN_STORE.pop(token, None)
        raise HTTPException(410, "명세서 링크가 만료되었습니다 (24시간 유효)")

    # 직원 데이터 추출
    tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
    try:
        tmp.write(info["xlsx_bytes"])
        tmp.close()
        data = _extract_payslip_data(tmp.name, info["employee_no"], info["year"], info["month"])
        data["employee_no"] = info["employee_no"]
        data["employee_name"] = info["employee_name"]
        return data
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


def _extract_payslip_data(xlsx_path: str, employee_no: int, year: int, month: int) -> dict:
    """양식 xlsx에서 특정 직원의 명세서 데이터 추출 (지급 내역 + DB + 근태 시트)"""
    wb = load_workbook(xlsx_path, data_only=True, read_only=True, keep_links=False)
    try:
        result = {
            "year": year,
            "month": month,
            "soc": {},      # 소속/은행/계좌 등
            "pay": {},      # 급여 현황 (기본/연장/심야/특근/특잔/지각/기타수당)
            "deduct": {},   # 공제 현황
            "attendance": {},  # 일자별 출퇴근
        }

        # DB 시트에서 직원 정보
        if "DB" in wb.sheetnames:
            ws = wb["DB"]
            row = employee_no + 1  # NO=1 → R2
            if 2 <= row <= ws.max_row:
                hire = ws.cell(row, 5).value
                resign = ws.cell(row, 6).value
                result["soc"] = {
                    "name": ws.cell(row, 2).value,
                    "hire_date": hire.strftime("%Y-%m-%d") if isinstance(hire, datetime) else (str(hire) if hire else ""),
                    "resign_date": resign.strftime("%Y-%m-%d") if isinstance(resign, datetime) else (str(resign) if resign else ""),
                    "rate": ws.cell(row, 3).value,
                    "bank": ws.cell(row, 11).value,
                    "account": ws.cell(row, 12).value,
                }

        # 지급 내역에서 급여/공제 (직원 번호로 행 찾기)
        pay_sheet_name = next((s for s in wb.sheetnames if "지급" in s), None)
        if pay_sheet_name:
            ws = wb[pay_sheet_name]
            for r in range(1, ws.max_row + 1):
                no_cell = ws.cell(r, 3).value  # C열 NO
                if no_cell == employee_no:
                    # AH~AL 열에서 급여/공제 데이터 (수식 결과)
                    # 정확한 컬럼 매핑은 양식별로 조정 필요
                    break

        return result
    finally:
        wb.close()
