# 더웰파트너 어드민 보안 점검 + OTP/비밀번호변경 구현 보고서

작성일: 2026-05-21

## 1. 보안 점검 결과 (발견 → 조치)

| # | 심각도 | 항목 | 상태 |
|---|--------|------|------|
| 1 | 🔴 치명 | **토큰 위조 가능** — `twp-{userId}-{ts}` 서명 없음. userId(UUID)만 알면 토큰 위조 → 관리자 권한 탈취 | ✅ HMAC-SHA256 서명 추가 |
| 2 | 🟠 높음 | **약한 비밀번호 해시** — SHA-256 + 전역 고정 salt. 사용자별 salt 없음, 빠른 해시(무차별 대입 취약) | ✅ PBKDF2-SHA256(10만회)+사용자별 salt |
| 3 | 🟡 보통 | **2단계 인증 부재** | ✅ TOTP(OTP) 추가 |
| 4 | 🟡 보통 | **자기 비밀번호 변경 UI 부재** (백엔드는 존재) | ✅ 보안 탭에 추가 |
| 5 | 🟢 낮음 | anon key 소스 하드코딩 폴백 | RLS 보호됨 — 환경변수 우선, 유지 |
| 6 | 🟢 낮음 | OTP 시크릿 응답 노출 위험 | ✅ stripSensitive에 otp_secret 추가 |

### 기존에 양호했던 점
- 로그인 Rate Limit (5회/분 → 5분 잠금), 감사로그, timing-safe 비교(신규), 토큰 24h 만료

## 2. 구현 상세

### 백엔드 (Edge Function: make-server-c3ee322d)
- **db.ts**:
  - `hashPassword`/`verifyPassword`: PBKDF2 신규 + 레거시 SHA-256 검증 호환 + `needsRehash`
  - `signToken`/`verifyToken`: HMAC-SHA256 서명. 마지막 세그먼트 64hex로 서명/레거시 판별(UUID 하이픈 안전)
  - `ENFORCE_SIGNED_TOKENS` 환경변수: 기본 off(레거시 허용=무중단), on이면 위조방지 강제
  - `signPending`/`verifyPending`: OTP 5분 단기 토큰(비번 검증 후에만 발급 → 2FA 우회 방지)
  - TOTP: `generateOtpSecret`/`verifyTotp`/`otpauthUri` (RFC 6238, ±30초 허용)
- **index.ts**:
  - `requireAuth`/`handleAuthMe`: `verifyToken` 사용(서명+만료 검증)
  - `handleLogin`: 서명 토큰 발급, 로그인 시 약한 해시 자동 업그레이드, OTP 사용자는 pendingToken 반환
  - 신규: `POST /admin/otp/verify-login`(미들웨어 예외), `GET /admin/otp/status`, `POST /admin/otp/setup|enable|disable`
  - `stripSensitive`: password_hash + otp_secret + otp_temp_secret 제거

### 프론트엔드
- **api.ts**: `login`(otpRequired 분기), `verifyOtpLogin`, `otpStatus/Setup/Enable/Disable`
- **AdminLogin.tsx**: 비번 성공 후 OTP 6자리 입력 2단계 화면
- **AccountSecurityCard.tsx**(신규): 비밀번호 변경 + 2FA(QR 로컬 생성 `qrcode`, 수동키, 해제)
- **AdminSettings.tsx**: 보안 탭에 카드 삽입

## 3. 검증 (로컬)
- TOTP RFC 6238 표준 벡터 3건 전부 일치 ✅
- PBKDF2 해시 라운드트립(정상 통과/오답 거부) ✅
- 토큰 서명/검증: UUID·admin-1 하이픈, 레거시 허용(무중단), enforce 거부, 변조 거부 ✅
- 프론트 빌드 성공 ✅

## 4. 배포 절차 (중요)
프론트=Vercel 자동 / FastAPI=Render 자동이지만 **Edge Function은 수동 배포** 필요:

```bash
# 1) Supabase CLI 로그인 (최초 1회)
supabase login
supabase link --project-ref ldgbxbutwxiixatlfpgq

# 2) (권장) 토큰 서명 시크릿 설정 — 미설정 시 SERVICE_ROLE_KEY 사용
supabase secrets set ADMIN_TOKEN_SECRET="<랜덤 32자 이상>"

# 3) Edge Function 배포
supabase functions deploy make-server-c3ee322d

# 4) 전 관리자 정상 로그인/OTP 확인 후, 위조방지 강제
supabase secrets set ENFORCE_SIGNED_TOKENS=true
supabase functions deploy make-server-c3ee322d   # 재배포로 반영
```

### 무중단 마이그레이션 보장
- Edge Function 배포 직후: 기존 로그인 세션 유지(레거시 토큰 허용), 신규 로그인은 서명 토큰
- 비밀번호: 다음 로그인 시 자동으로 PBKDF2로 업그레이드
- 모두 재로그인 확인 후 `ENFORCE_SIGNED_TOKENS=true`로 위조 취약점 완전 차단

## 5. 잔여 권장사항
- `supabase/functions/server/`(레거시 사본)는 미동기화 — 사용 안 하면 삭제 권장
- 비밀번호 강도 정책 강화(특수문자) 검토
- 관리자별 OTP 의무화 정책(선택)
