# 더웰파트너 처리 API (Python FastAPI)

PDF 출근부 → 청구 엑셀 자동 입력 백엔드.
**openpyxl** 기반으로 수식·서식을 100% 보존합니다.

어드민 사이트(`thewellpartner.com`)와 분리된 별도 서버입니다.

---

## 📂 구조

```
backend-api/
├── app/
│   ├── main.py                    ← FastAPI 진입
│   ├── auth.py                    ← X-Admin-Token 검증
│   ├── routers/
│   │   └── attendance.py          ← /api/attendance/process
│   └── services/
│       ├── attendance_parser.py   ← PDF 파싱
│       ├── excel_writer.py        ← 근태 시트 입력 (수식 보호)
│       ├── leave_writer.py        ← 연차내역 입력
│       └── validator.py           ← 검증
├── requirements.txt
├── render.yaml                    ← Render 배포 설정
└── README.md
```

---

## 🚀 로컬 실행

```bash
cd backend-api
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --port 8000
```

→ `http://localhost:8000/docs` 에서 Swagger UI 확인 가능

---

## ☁️ Render 배포 (무료)

### 1단계: GitHub에 백엔드 푸시

```bash
cd backend-api
git init
git add .
git commit -m "Initial: FastAPI 처리 백엔드"
git remote add origin https://github.com/{your-username}/thewellpartner-api.git
git push -u origin main
```

> 또는 모노레포: 더웰파트너 메인 저장소의 `backend-api/` 디렉터리를
> Render에서 Root Directory로 지정해도 됩니다.

### 2단계: Render 대시보드 설정

1. https://render.com 가입 (GitHub 계정 권장)
2. **New +** → **Web Service** 클릭
3. GitHub 저장소 연결
4. 설정:
   - **Name**: `thewellpartner-api`
   - **Region**: `Singapore` (한국에서 가장 빠름)
   - **Branch**: `main`
   - **Root Directory**: `backend-api` (모노레포면)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free` ✅
5. **Environment Variables** 설정:
   - `ADMIN_API_TOKEN` = (강력한 랜덤 토큰, 어드민 로그인 토큰과 동일하게 사용 시 비워두세요)
   - `ALLOWED_ORIGINS` = `https://thewellpartner.com,https://www.thewellpartner.com,https://thewellpartner.vercel.app`
6. **Create Web Service** 클릭 → 자동 빌드/배포 (3~5분)

### 3단계: 배포된 URL 확인

```
https://thewellpartner-api.onrender.com
```

→ 헬스체크: `https://thewellpartner-api.onrender.com/health` → `{"status":"ok"}`

### 4단계: 어드민 프론트에서 URL 등록

`.env.local` 또는 Vercel 환경변수에 추가:

```
VITE_ATTENDANCE_API_URL=https://thewellpartner-api.onrender.com
```

→ Vercel 대시보드 → Project → Settings → Environment Variables → 추가 후 재배포

---

## ⚠️ Render Free Tier 제약

- **15분 미사용 시 슬립** → 첫 요청 시 30~60초 콜드 스타트
- **월 750시간** 무료 (단일 서비스 기준 충분)
- **CPU 0.1 / RAM 512MB**

본인이 매달 1~5회 사용하는 정도면 충분합니다.
콜드 스타트가 답답하면 Starter 유료 ($7/월 ≈ ₩9,500)로 업그레이드.

---

## 🔒 인증

### X-Admin-Token 헤더

어드민 프론트가 자동으로 `X-Admin-Token` 헤더에 로그인 토큰을 넣어 호출합니다.
백엔드는 환경변수 `ADMIN_API_TOKEN`과 일치하는지 확인.

**주의**: 현재 어드민 토큰은 로그인 시 발급되는 JWT/세션 토큰입니다.
간단한 운영을 위해 별도의 고정 API 토큰을 발급해서 양쪽에 동일하게 설정하는 방식을 권장합니다.

```bash
# 강력한 랜덤 토큰 생성 (예시)
py -c "import secrets; print(secrets.token_urlsafe(32))"
```

생성된 토큰을:
1. Render 환경변수 `ADMIN_API_TOKEN`에 등록
2. 어드민 클라이언트에서 호출 시 동일 값 사용 (필요 시 별도 메커니즘)

> **개발 모드**: `ADMIN_API_TOKEN`이 비어있으면 인증 없이 통과합니다.

---

## 📡 API 엔드포인트

### `GET /health`
헬스체크. 콜드 스타트 깨우기용.

### `POST /api/attendance/process`
**Multipart Form Data**:
- `pdf` (file, required)
- `excel` (file, required)
- `year` (int, required)
- `month` (int, required)
- `holidays` (string) — `"2026-05-05 어린이날\n2026-05-25 부처님오신날"`
- `standard_hours` (int, default 209)
- `normal_start` (string, default "08:30")
- `normal_end` (string, default "17:30")
- `sheet_name` (string, optional) — 비우면 자동 감지
- `leave_sheet_name` (string, default "연차내역")
- `overwrite_existing` (bool, default false)

**Response**:
- Body: 완성 엑셀 바이너리 (`.xlsx`)
- Header `X-Process-Result`: 처리 통계 JSON (hex 인코딩)
- Header `Content-Disposition`: `attachment; filename="..."`

### `POST /api/attendance/preview`
PDF만 파싱해서 미리보기 JSON 반환 (엑셀 처리 X).

---

## 🛡 안전 보장

- ✅ 원본 엑셀은 `shutil.copyfile`로 복사 (직접 수정 안 함)
- ✅ `load_workbook(..., data_only=False)` 로 수식 그대로 유지
- ✅ 수식 셀 자동 차단: `cell.value.startswith("=")` 검사
- ✅ 병합 셀 좌상단(anchor)이 아니면 입력 시도 안 함
- ✅ 저장 후 자동 검증 (수식 개수/내용/병합셀 변화)

---

## 🐛 트러블슈팅

### `ModuleNotFoundError: pdfplumber`
```bash
pip install -r requirements.txt
```

### CORS 차단
Render 환경변수 `ALLOWED_ORIGINS`에 어드민 도메인 추가.

### 401 Unauthorized
환경변수 `ADMIN_API_TOKEN`과 어드민이 보내는 토큰이 일치하는지 확인.
임시로 `ADMIN_API_TOKEN`을 비워두면 인증 우회 가능 (개발용).

### 처리 시간 초과
- Free Tier: 첫 요청 30~60초 콜드 스타트 정상
- 처리 자체는 5~10초
- 클라이언트 timeout은 120초로 설정됨
