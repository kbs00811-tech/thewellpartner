좋습니다.
이어서 **2단계: 채용 + ERP + 서류발급 통합 API 설계**를 순서대로 정리하겠습니다.

이번 문서는 개발팀이 바로 참고할 수 있도록
**사용자용 / 관리자용 / ERP용 / 공통 인증용**으로 나눠서 구성하겠습니다.

---

# 2단계 적용

# 더웰파트너 통합 API 설계

## 1. API 설계 기준

### 기본 원칙

* REST API 기준
* JSON 응답 통일
* 관리자와 사용자 API 분리
* 업로드 파일은 multipart/form-data 사용
* 인증은 JWT 기반
* 서류발급은 임시 인증 토큰 별도 사용

### 공통 Prefix 예시

```text
/api/v1
```

구조 예시

```text
/api/v1/public
/api/v1/auth
/api/v1/jobs
/api/v1/inquiries
/api/v1/docs
/api/v1/admin
/api/v1/erp
```

---

## 2. 공통 응답 형식

### 성공 응답

```json
{
  "success": true,
  "message": "정상 처리되었습니다.",
  "data": {},
  "meta": {}
}
```

### 실패 응답

```json
{
  "success": false,
  "message": "오류가 발생했습니다.",
  "errorCode": "INVALID_REQUEST",
  "errors": []
}
```

---

## 3. 인증 API

# 3-1. 관리자 로그인

### POST `/api/v1/auth/admin/login`

#### Request

```json
{
  "username": "admin",
  "password": "password123!"
}
```

#### Response

```json
{
  "success": true,
  "message": "로그인되었습니다.",
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "admin": {
      "id": 1,
      "name": "관리자",
      "role": "SUPER_ADMIN"
    }
  }
}
```

---

# 3-2. 관리자 로그아웃

### POST `/api/v1/auth/admin/logout`

---

# 3-3. 토큰 재발급

### POST `/api/v1/auth/refresh`

---

# 3-4. 내 정보 조회

### GET `/api/v1/auth/me`

---

## 4. 홈페이지 Public API

# 4-1. 메인 배너 조회

### GET `/api/v1/public/banners`

---

# 4-2. 페이지 조회

### GET `/api/v1/public/pages/{pageCode}`

예시

```text
/api/v1/public/pages/about
/api/v1/public/pages/service
```

---

# 4-3. 사업분야 목록

### GET `/api/v1/public/business-areas`

---

# 4-4. 서비스 프로세스 목록

### GET `/api/v1/public/service-processes`

---

# 4-5. FAQ 목록

### GET `/api/v1/public/faqs`

Query

```text
?categoryId=1
```

---

# 4-6. 공지사항 목록

### GET `/api/v1/public/notices`

### GET `/api/v1/public/notices/{id}`

---

# 4-7. 협력사 목록

### GET `/api/v1/public/partners`

---

## 5. 채용 Public API

# 5-1. 채용공고 목록 조회

### GET `/api/v1/jobs`

Query 예시

```text
?page=1&size=20
&keyword=생산
&jobCategoryId=1
&location=화성
&dormitory=true
&foreignerAllowed=true
&status=OPEN
```

#### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 101,
        "title": "화성 생산직 모집",
        "companyName": "더웰파트너",
        "workLocation": "경기 화성",
        "salaryType": "MONTHLY",
        "salaryMin": 3200000,
        "salaryMax": 3800000,
        "dormitoryAvailable": true,
        "foreignerAllowed": true,
        "status": "OPEN"
      }
    ]
  },
  "meta": {
    "page": 1,
    "size": 20,
    "totalCount": 120
  }
}
```

---

# 5-2. 채용공고 상세 조회

### GET `/api/v1/jobs/{jobPostId}`

---

# 5-3. 채용공고 태그/필터 옵션 조회

### GET `/api/v1/jobs/filters`

응답 예시

* 지역 목록
* 직무 카테고리
* 기숙사 여부
* 외국인 가능 여부

---

# 5-4. 지원하기

### POST `/api/v1/jobs/{jobPostId}/apply`

#### Request

```json
{
  "name": "홍길동",
  "mobile": "01012345678",
  "email": "test@test.com",
  "birthDate": "1995-01-01",
  "gender": "M",
  "nationality": "KR",
  "desiredLocation": "화성",
  "desiredJob": "생산직",
  "careerSummary": "생산직 2년",
  "visaType": null,
  "koreanLevel": null,
  "dormitoryNeeded": true,
  "shiftAvailable": true,
  "selfIntro": "성실하게 근무 가능합니다."
}
```

파일 업로드 포함 시 multipart 처리

---

# 5-5. 이력서 업로드

### POST `/api/v1/jobs/resumes/upload`

Form Data:

* applicantId
* file

---

# 5-6. 내 지원내역 조회

로그인형 기능으로 확장할 경우

### GET `/api/v1/jobs/my-applications`

---

## 6. 문의 Public API

# 6-1. 문의 접수

### POST `/api/v1/inquiries`

#### Request

```json
{
  "inquiryType": "COMPANY",
  "companyName": "ABC회사",
  "name": "김담당",
  "mobile": "01011112222",
  "email": "manager@abc.com",
  "title": "인력 문의",
  "content": "생산직 20명 필요합니다."
}
```

---

# 6-2. 문의 유형 목록

### GET `/api/v1/inquiries/types`

---

# 6-3. 문의 첨부파일 업로드

### POST `/api/v1/inquiries/attachments`

---

## 7. 서류발급 Public API

# 7-1. 인증번호 발송

### POST `/api/v1/docs/auth/send-code`

#### Request

```json
{
  "employeeNo": "DW2025001",
  "name": "홍길동",
  "birthDate": "1990-01-01",
  "mobile": "01012345678"
}
```

#### Response

```json
{
  "success": true,
  "message": "인증번호가 발송되었습니다.",
  "data": {
    "requestId": 3001,
    "expireSeconds": 180
  }
}
```

---

# 7-2. 인증번호 확인

### POST `/api/v1/docs/auth/verify-code`

#### Request

```json
{
  "requestId": 3001,
  "code": "482913"
}
```

#### Response

```json
{
  "success": true,
  "message": "본인인증이 완료되었습니다.",
  "data": {
    "accessToken": "temp_docs_token"
  }
}
```

---

# 7-3. 발급 가능 서류 목록

### GET `/api/v1/docs/available`

Header

```text
Authorization: Bearer {temp_docs_token}
```

---

# 7-4. 증명서 발급

### POST `/api/v1/docs/issue/certificate`

#### Request

```json
{
  "docType": "EMPLOYMENT_CERT",
  "submissionTarget": "은행",
  "purpose": "대출심사",
  "language": "KO"
}
```

---

# 7-5. 급여명세서 목록 조회

### GET `/api/v1/docs/payroll?year=2025`

---

# 7-6. 급여명세서 다운로드

### GET `/api/v1/docs/payroll/{year}/{month}/download`

---

# 7-7. 원천징수영수증 목록 조회

### GET `/api/v1/docs/tax`

---

# 7-8. 원천징수영수증 다운로드

### GET `/api/v1/docs/tax/{year}/download`

---

# 7-9. 발급 이력 조회

### GET `/api/v1/docs/history`

---

## 8. 관리자 API

# 8-1. 대시보드

### GET `/api/v1/admin/dashboard`

응답 항목 예시

* 오늘 문의 수
* 오늘 지원자 수
* 진행중 공고 수
* 오늘 서류발급 수
* 최근 문의 5건
* 최근 지원 5건

---

# 8-2. 홈페이지 관리 API

## 배너 관리

* GET `/api/v1/admin/banners`
* POST `/api/v1/admin/banners`
* PUT `/api/v1/admin/banners/{id}`
* DELETE `/api/v1/admin/banners/{id}`

## 페이지 관리

* GET `/api/v1/admin/pages`
* GET `/api/v1/admin/pages/{id}`
* PUT `/api/v1/admin/pages/{id}`

## 사업분야 관리

* GET `/api/v1/admin/business-areas`
* POST `/api/v1/admin/business-areas`
* PUT `/api/v1/admin/business-areas/{id}`
* DELETE `/api/v1/admin/business-areas/{id}`

## FAQ 관리

* GET `/api/v1/admin/faqs`
* POST `/api/v1/admin/faqs`
* PUT `/api/v1/admin/faqs/{id}`
* DELETE `/api/v1/admin/faqs/{id}`

## 공지사항 관리

* GET `/api/v1/admin/notices`
* POST `/api/v1/admin/notices`
* PUT `/api/v1/admin/notices/{id}`
* DELETE `/api/v1/admin/notices/{id}`

## 팝업 관리

* GET `/api/v1/admin/popups`
* POST `/api/v1/admin/popups`
* PUT `/api/v1/admin/popups/{id}`
* DELETE `/api/v1/admin/popups/{id}`

---

# 8-3. 채용 관리 API

## 채용공고 관리

* GET `/api/v1/admin/job-posts`
* POST `/api/v1/admin/job-posts`
* GET `/api/v1/admin/job-posts/{id}`
* PUT `/api/v1/admin/job-posts/{id}`
* DELETE `/api/v1/admin/job-posts/{id}`

## 지원자 관리

* GET `/api/v1/admin/applicants`
* GET `/api/v1/admin/applicants/{id}`
* PUT `/api/v1/admin/applicants/{id}`

## 지원내역 관리

* GET `/api/v1/admin/job-applications`
* GET `/api/v1/admin/job-applications/{id}`
* PUT `/api/v1/admin/job-applications/{id}/status`

#### 상태변경 Request 예시

```json
{
  "status": "INTERVIEW",
  "memo": "3월 15일 면접 예정"
}
```

## 인재풀 관리

* GET `/api/v1/admin/talent-pool`
* POST `/api/v1/admin/talent-pool`
* PUT `/api/v1/admin/talent-pool/{id}`

---

# 8-4. 문의 관리 API

## 문의 목록

* GET `/api/v1/admin/inquiries`
* GET `/api/v1/admin/inquiries/{id}`

## 문의 상태 변경

* PUT `/api/v1/admin/inquiries/{id}/status`

## 문의 메모

* POST `/api/v1/admin/inquiries/{id}/memos`
* GET `/api/v1/admin/inquiries/{id}/memos`

## 담당자 지정

* PUT `/api/v1/admin/inquiries/{id}/assign`

---

# 8-5. 직원 / 서류 관리 API

## 직원 관리

* GET `/api/v1/admin/employees`
* POST `/api/v1/admin/employees`
* GET `/api/v1/admin/employees/{id}`
* PUT `/api/v1/admin/employees/{id}`

## 퇴직자 포함 검색

```text
GET /api/v1/admin/employees?employmentStatus=RESIGNED
```

## 서류 템플릿 관리

* GET `/api/v1/admin/document-templates`
* POST `/api/v1/admin/document-templates`
* PUT `/api/v1/admin/document-templates/{id}`

## 발급 로그

* GET `/api/v1/admin/issued-documents`

## 인증 로그

* GET `/api/v1/admin/verification-requests`

## 급여명세서 관리

* GET `/api/v1/admin/payroll-documents`
* POST `/api/v1/admin/payroll-documents`
* DELETE `/api/v1/admin/payroll-documents/{id}`

## 원천징수영수증 관리

* GET `/api/v1/admin/tax-documents`
* POST `/api/v1/admin/tax-documents`
* DELETE `/api/v1/admin/tax-documents/{id}`

---

## 9. ERP API

# 9-1. 고객사 관리

* GET `/api/v1/erp/client-companies`
* POST `/api/v1/erp/client-companies`
* GET `/api/v1/erp/client-companies/{id}`
* PUT `/api/v1/erp/client-companies/{id}`

---

# 9-2. 현장 관리

* GET `/api/v1/erp/work-sites`
* POST `/api/v1/erp/work-sites`
* GET `/api/v1/erp/work-sites/{id}`
* PUT `/api/v1/erp/work-sites/{id}`

---

# 9-3. 현장별 직무 관리

* GET `/api/v1/erp/work-sites/{id}/positions`
* POST `/api/v1/erp/work-sites/{id}/positions`
* PUT `/api/v1/erp/work-sites/{id}/positions/{positionId}`

---

# 9-4. 배치 관리

* GET `/api/v1/erp/placements`
* POST `/api/v1/erp/placements`
* PUT `/api/v1/erp/placements/{id}`
* PUT `/api/v1/erp/placements/{id}/end`

#### 배치 등록 Request 예시

```json
{
  "employeeId": 501,
  "workSiteId": 21,
  "siteJobPositionId": 7,
  "assignedDate": "2026-03-12",
  "shiftGroup": "DAY"
}
```

---

# 9-5. 근태 관리

## 근태 입력

* POST `/api/v1/erp/attendance`

## 근태 수정

* PUT `/api/v1/erp/attendance/{id}`

## 근태 조회

* GET `/api/v1/erp/attendance`

Query 예시

```text
?employeeId=501&workSiteId=21&from=2026-03-01&to=2026-03-31
```

#### 근태 입력 Request 예시

```json
{
  "employeeId": 501,
  "workSiteId": 21,
  "workDate": "2026-03-12",
  "attendanceStatus": "PRESENT",
  "checkInTime": "08:00",
  "checkOutTime": "19:30",
  "overtimeHours": 2.5,
  "nightHours": 0,
  "holidayHours": 0
}
```

---

# 9-6. 급여기초 관리

* GET `/api/v1/erp/payroll-base-records`
* POST `/api/v1/erp/payroll-base-records`
* PUT `/api/v1/erp/payroll-base-records/{id}`

---

# 9-7. 대체인력 요청

* GET `/api/v1/erp/replacement-requests`
* POST `/api/v1/erp/replacement-requests`
* PUT `/api/v1/erp/replacement-requests/{id}/status`

---

## 10. 외국인 / 비자 관리 API

# 10-1. 비자 목록

* GET `/api/v1/admin/visa-types`

---

# 10-2. 외국인 프로필 관리

* GET `/api/v1/admin/foreign-workers`
* POST `/api/v1/admin/foreign-workers`
* GET `/api/v1/admin/foreign-workers/{id}`
* PUT `/api/v1/admin/foreign-workers/{id}`

---

# 10-3. 비자 변경 이력

* GET `/api/v1/admin/foreign-workers/{id}/visa-histories`
* POST `/api/v1/admin/foreign-workers/{id}/visa-histories`

---

# 10-4. 외국인 문서 관리

* GET `/api/v1/admin/foreign-workers/{id}/documents`
* POST `/api/v1/admin/foreign-workers/{id}/documents`

---

# 10-5. 체류만료 예정자 조회

* GET `/api/v1/admin/foreign-workers/visa-expiring`

Query 예시

```text
?days=30
```

---

## 11. 파일 업로드 API

# 11-1. 공통 파일 업로드

### POST `/api/v1/files/upload`

Form Data:

* file
* category

예시 category

* banner
* resume
* payroll
* tax
* document-template
* partner-logo

---

# 11-2. 파일 다운로드

### GET `/api/v1/files/{fileId}/download`

---

## 12. 통계 API

# 12-1. 채용 통계

* GET `/api/v1/admin/statistics/recruit`

# 12-2. 문의 통계

* GET `/api/v1/admin/statistics/inquiries`

# 12-3. 서류발급 통계

* GET `/api/v1/admin/statistics/documents`

# 12-4. ERP 통계

* GET `/api/v1/admin/statistics/erp`

---

## 13. 상태 코드 표준 예시

### 공통 HTTP Status

* 200 OK
* 201 Created
* 400 Bad Request
* 401 Unauthorized
* 403 Forbidden
* 404 Not Found
* 409 Conflict
* 422 Unprocessable Entity
* 500 Internal Server Error

### 비즈니스 에러코드 예시

```text
INVALID_REQUEST
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
ALREADY_EXISTS
INVALID_STATUS
VERIFICATION_EXPIRED
VERIFICATION_FAILED
DOCUMENT_NOT_AVAILABLE
PAYROLL_NOT_FOUND
TAX_DOCUMENT_NOT_FOUND
EMPLOYEE_NOT_FOUND
JOB_POST_CLOSED
APPLICATION_DUPLICATED
```

---

## 14. 1차 개발에 필요한 핵심 API 우선순위

### 홈페이지

* banners
* pages
* business-areas
* faqs
* notices

### 채용

* jobs list
* jobs detail
* apply
* admin job-posts
* admin job-applications

### 문의

* inquiries create
* admin inquiries

### 서류발급

* docs auth
* docs available
* docs certificate issue
* docs payroll
* docs tax

### 관리자

* auth login
* dashboard
* employees
* payroll-documents
* issued-documents

즉, 1차 MVP는 약 **40~50개 API** 정도면 충분합니다.

---

## 15. 권장 백엔드 모듈 구조

```text
src
├ auth
├ public-site
├ jobs
├ inquiries
├ documents
├ employees
├ admin
├ erp
├ foreign-workers
├ files
├ statistics
├ common
```

---

## 16. 다음 순서

다음은 **3단계: Figma 와이어프레임 전체 화면(40페이지) 구조 설계**로 넘어가면 됩니다.

다음 답변에서 바로
**홈페이지 + 관리자 + 서류발급 + ERP까지 포함한 Figma 페이지/프레임 구조를 화면 번호 기준으로** 정리해드리겠습니다.
