좋습니다. 지금까지 만든 내용을 **“더웰파트너 홈페이지 구축 마스터 정리”**로 한 번에 보기 쉽게 정리했습니다.
이 문서는 **디자이너(피그마) + 개발자 + 내부 기획용**으로 바로 전달 가능한 수준입니다.

---

# 더웰파트너 아웃소싱 홈페이지 구축 마스터 정리

## 1. 프로젝트 목적

더웰파트너 홈페이지는 단순 회사소개 사이트가 아니라 **아웃소싱 인력 운영 플랫폼**의 시작점입니다.

핵심 목적

1. 기업 고객 상담 유입
2. 구직자 채용 시스템
3. 직원 서류 자동 발급
4. 관리자 운영 시스템 구축
5. 향후 ERP 및 외국인 인력 플랫폼 확장

---

# 2. 전체 플랫폼 구조

```
더웰파트너 플랫폼

1. 기업 홈페이지
2. 채용 시스템
3. 문의 / 상담 시스템
4. 서류발급센터
5. 관리자(Admin)
6. ERP 인력운영 (2차 개발)
7. 외국인 인력관리 (3차 개발)
```

---

# 3. 홈페이지 메뉴 구조

```
HOME
회사소개
사업분야
서비스 시스템
채용정보
고객센터
문의하기
서류발급센터
```

---

# 4. 홈페이지 페이지 구성

## 메인페이지

구성

1 메인 비주얼
2 회사 핵심 역량
3 사업분야
4 인력 운영 시스템
5 HR 관리 시스템
6 회사 규모
7 협력기업
8 상담 CTA

---

## 회사소개

구성

* 대표 인사말
* 회사 개요
* 조직도
* 회사 위치

---

## 사업분야

카테고리

* 생산 도급
* 인재 파견
* 컨설팅
* 교육훈련
* 빌딩 관리
* HR 서비스

---

## 서비스 시스템

내용

* 인력 운영 프로세스
* 채용 절차
* 교육 시스템
* 현장 운영 관리

---

## 채용정보

기능

* 채용공고 목록
* 채용공고 상세
* 지원하기
* 직무별 채용
* 지역별 채용

---

## 고객센터

구성

* 공지사항
* FAQ
* 문의하기

---

## 문의하기

입력 항목

* 문의 유형
* 회사명
* 이름
* 연락처
* 이메일
* 문의내용
* 파일첨부

---

## 서류발급센터

직원 또는 퇴직자가 직접 다운로드

발급 가능 문서

* 재직증명서
* 퇴직증명서
* 경력증명서
* 급여명세서
* 원천징수영수증

---

# 5. 서류발급 시스템

## 인증 절차

```
사번 입력
이름 입력
생년월일 입력
휴대폰 인증
```

인증 완료 후

서류 다운로드 가능

---

## 발급 가능한 문서

| 문서      | 방식      |
| ------- | ------- |
| 재직증명서   | 자동 생성   |
| 퇴직증명서   | 자동 생성   |
| 경력증명서   | 자동 생성   |
| 급여명세서   | 관리자 업로드 |
| 원천징수영수증 | 관리자 업로드 |

---

# 6. 채용 시스템

## 구직자 기능

* 채용공고 조회
* 공고 상세
* 지원하기
* 이력서 업로드

---

## 관리자 채용 기능

* 채용공고 등록
* 공고 수정
* 지원자 관리
* 지원 상태 관리

지원 상태 예시

```
지원접수
상담
면접
합격
불합격
보류
```

---

# 7. 관리자(Admin) 시스템

관리자 메뉴

```
대시보드
홈페이지 관리
채용 관리
문의 관리
직원 관리
서류발급 관리
통계
시스템 설정
```

---

## 관리자 권한

권장 구조

| 권한            | 기능      |
| ------------- | ------- |
| SUPER_ADMIN   | 전체관리    |
| WEBSITE_ADMIN | 홈페이지 관리 |
| RECRUIT_ADMIN | 채용 관리   |
| HR_ADMIN      | 직원 / 서류 |
| VIEWER        | 조회만     |

---

# 8. 데이터베이스 구조

전체 DB 설계

약 **50개 테이블**

하지만

1차 개발은 **20개 테이블**이면 충분합니다.

---

## 핵심 테이블

### 관리자

* admin_users
* admin_roles
* admin_permissions

---

### 홈페이지

* site_banners
* site_pages
* business_areas
* faqs
* notices

---

### 채용

* job_posts
* applicants
* job_applications

---

### 문의

* inquiries
* inquiry_memos

---

### 직원

* employees

---

### 서류

* verification_requests
* document_templates
* issued_documents
* payroll_documents
* tax_documents

---

# 9. API 구조

기본 prefix

```
/api/v1
```

---

## Public API

```
/public/banners
/public/pages
/public/business-areas
/public/notices
/public/faqs
```

---

## 채용 API

```
/jobs
/jobs/{id}
/jobs/apply
/jobs/resume-upload
```

---

## 문의 API

```
/inquiries
/inquiries/types
```

---

## 서류발급 API

```
/docs/auth/send-code
/docs/auth/verify-code
/docs/available
/docs/issue
/docs/payroll
/docs/tax
```

---

## 관리자 API

```
/admin/dashboard
/admin/job-posts
/admin/applicants
/admin/inquiries
/admin/employees
/admin/document-templates
/admin/issued-documents
```

---

# 10. 피그마 구조

피그마 페이지

```
Design Guide
Components

Home
About
Business
Service
Recruit
Contact
Docs Center

Admin Login
Admin Dashboard
Website Admin
Recruit Admin
Applicant Admin
Inquiry Admin
Employee Admin
Document Admin
ERP Admin
Statistics
Settings
```

---

# 11. 개발 기술

추천 스택

### Frontend

```
Next.js
React
Tailwind
```

---

### Backend

```
Node.js
NestJS
Express
```

---

### Database

```
PostgreSQL
또는
MariaDB
```

---

### Storage

```
AWS S3
```

---

### 인증

```
JWT
SMS 인증
```

---

# 12. 개발 단계

## 1차 개발

홈페이지 + 채용 + 문의 + 서류발급

기간

약 **4~6주**

---

## 2차 개발

ERP

* 인력관리
* 현장관리
* 근태관리
* 급여관리

---

## 3차 개발

외국인 인력 플랫폼

* 비자관리
* 체류관리
* 유학생 취업
* 다국어 지원

---

# 13. 최종 목표

더웰파트너 시스템 확장

```
회사 홈페이지
↓
채용 시스템
↓
서류발급 시스템
↓
아웃소싱 ERP
↓
외국인 인력 플랫폼
↓
종합 인력 플랫폼
```

---

# 14. 실제 제작 시작 시 필요한 것

개발 시작 전에 반드시 필요한 것

1. 로고
2. 회사소개 문구
3. 사업분야 설명
4. 채용공고 샘플
5. 관리자 계정 정책
6. 서류 양식

---

## 다음 단계

원하시면 제가 **실제로 가장 중요한 것**도 만들어 드릴 수 있습니다.

1️⃣ **피그마 전체 화면 설계 (50개 화면)**
2️⃣ **더웰파트너 홈페이지 실제 디자인 구조**
3️⃣ **개발자 전달용 기능 명세서**
4️⃣ **아웃소싱 ERP 전체 설계**

특히 **① 피그마 전체 설계**는 홈페이지 제작에서 가장 중요한 단계입니다.
