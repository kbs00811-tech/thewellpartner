좋습니다.
그럼 **1번부터 순서대로 적용**하겠습니다.

이번 단계는 **① 더웰파트너 전체 DB 구조 설계**입니다.
바로 개발에 들어갈 수 있도록 **홈페이지 + 채용 + 문의 + 서류발급 + ERP + 외국인관리 + 관리자**까지 통합한 기준으로 잡겠습니다.

---

# 1단계 적용

# 더웰파트너 통합 DB 구조 설계

## 1. 전체 DB 영역

```text
DB 영역

1. 관리자 / 권한
2. 홈페이지 콘텐츠
3. 채용공고 / 지원자
4. 문의 / 상담
5. 직원 / 퇴직자
6. 서류발급
7. ERP 인력운영
8. 외국인 / 비자관리
9. 파일 / 로그 / 공통코드
```

---

# 2. 테이블 전체 구조

## A. 관리자 / 권한 영역

### 1) admin_users

관리자 계정

주요 컬럼

* id
* username
* password_hash
* name
* email
* mobile
* role_id
* status
* last_login_at
* created_at
* updated_at

### 2) admin_roles

권한 그룹

* id
* role_name
* role_code
* description

예시

* SUPER_ADMIN
* WEBSITE_ADMIN
* RECRUIT_ADMIN
* HR_ADMIN
* VIEWER

### 3) admin_permissions

세부 권한

* id
* permission_name
* permission_code
* description

### 4) admin_role_permissions

권한 매핑

* id
* role_id
* permission_id

### 5) admin_login_logs

관리자 로그인 기록

* id
* admin_user_id
* login_ip
* user_agent
* login_result
* created_at

---

## B. 홈페이지 콘텐츠 영역

### 6) site_banners

메인 배너

* id
* title
* subtitle
* button_text
* button_link
* image_file_id
* sort_order
* is_active
* created_at
* updated_at

### 7) site_pages

정적 페이지

* id
* page_code
* page_name
* seo_title
* seo_description
* content_html
* is_active
* updated_by
* updated_at

예시 page_code

* about
* service
* contact
* docs-center

### 8) business_areas

사업분야

* id
* title
* short_desc
* content
* icon_file_id
* image_file_id
* sort_order
* is_active

### 9) service_processes

서비스 프로세스

* id
* step_no
* title
* description
* icon_file_id
* is_active

### 10) faq_categories

FAQ 카테고리

* id
* name
* sort_order
* is_active

### 11) faqs

FAQ

* id
* category_id
* question
* answer
* sort_order
* is_active
* created_at

### 12) notices

공지사항

* id
* title
* content
* is_pinned
* view_count
* is_active
* created_at
* updated_at

### 13) popups

팝업관리

* id
* title
* image_file_id
* link_url
* start_at
* end_at
* is_active

### 14) partners

고객사 / 협력사

* id
* company_name
* logo_file_id
* website_url
* sort_order
* is_active

---

## C. 채용공고 / 지원자 영역

### 15) job_categories

직무 카테고리

* id
* name
* parent_id
* sort_order
* is_active

예시

* 생산
* 물류
* 사무
* 반도체
* 청소
* 경비

### 16) job_posts

채용공고

* id
* title
* company_name
* work_location
* job_category_id
* employment_type
* salary_type
* salary_min
* salary_max
* working_hours
* dormitory_available
* commute_bus_available
* foreigner_allowed
* visa_note
* recruitment_count
* description
* qualification
* preference
* status
* published_at
* deadline_at
* created_by
* created_at
* updated_at

상태값

* DRAFT
* OPEN
* CLOSED
* HIDDEN

### 17) job_post_tags

공고 태그

* id
* job_post_id
* tag_name

예시

* 기숙사
* 2교대
* 초보가능
* 외국인가능

### 18) applicants

지원자 기본 정보

* id
* name
* mobile
* email
* birth_date
* gender
* nationality
* current_address
* desired_location
* desired_job
* career_summary
* visa_type
* korean_level
* dormitory_needed
* shift_available
* created_at
* updated_at

### 19) applicant_resumes

이력서

* id
* applicant_id
* title
* resume_file_id
* self_intro
* is_default
* created_at

### 20) job_applications

공고 지원 내역

* id
* job_post_id
* applicant_id
* resume_id
* apply_channel
* status
* memo
* applied_at
* updated_at

상태값

* APPLIED
* CONTACTED
* COUNSELED
* INTERVIEW
* PASSED
* FAILED
* HOLD

### 21) applicant_status_logs

지원 상태 변경 이력

* id
* job_application_id
* from_status
* to_status
* changed_by
* memo
* created_at

### 22) talent_pool_profiles

인재풀

* id
* applicant_id
* preferred_region
* preferred_job_category_id
* employment_status
* available_date
* is_active
* note

---

## D. 문의 / 상담 영역

### 23) inquiry_types

문의 유형

* id
* type_name
* type_code

예시

* COMPANY
* JOB_SEEKER
* PARTNERSHIP

### 24) inquiries

문의 접수

* id
* inquiry_type_id
* company_name
* name
* mobile
* email
* title
* content
* status
* assigned_admin_id
* created_at
* updated_at

상태값

* RECEIVED
* CHECKING
* COUNSELED
* HOLD
* CLOSED

### 25) inquiry_memos

문의 상담 메모

* id
* inquiry_id
* admin_user_id
* memo
* created_at

### 26) inquiry_attachments

문의 첨부파일

* id
* inquiry_id
* file_id
* created_at

---

## E. 직원 / 퇴직자 영역

### 27) employees

직원 기본정보

* id
* employee_no
* name
* birth_date
* mobile
* email
* department_id
* position_id
* employment_status
* hire_date
* resign_date
* employment_type
* resident_type
* nationality
* address
* emergency_contact
* created_at
* updated_at

상태값

* ACTIVE
* RESIGNED
* LEAVE
* BLOCKED

### 28) departments

부서관리

* id
* name
* sort_order
* is_active

### 29) positions

직급관리

* id
* name
* sort_order
* is_active

### 30) employee_documents

직원 보유 문서

* id
* employee_id
* doc_type
* file_id
* issue_date
* expire_date
* note

예시

* 근로계약서
* 통장사본
* 신분증
* 비자서류

### 31) employee_status_logs

재직상태 변경 이력

* id
* employee_id
* from_status
* to_status
* reason
* changed_by
* created_at

---

## F. 서류발급 영역

### 32) verification_requests

본인인증 요청

* id
* employee_no
* name
* birth_date
* mobile
* verification_code
* expires_at
* verified_at
* fail_count
* status
* request_ip
* created_at

### 33) document_templates

문서 템플릿

* id
* doc_type
* template_name
* file_id
* version_no
* is_active
* created_at

문서종류

* EMPLOYMENT_CERT
* RESIGNATION_CERT
* CAREER_CERT
* PAYROLL
* TAX_CERT

### 34) issued_documents

발급 이력

* id
* employee_id
* doc_type
* issue_no
* file_id
* issue_status
* request_ip
* download_count
* issued_at

### 35) payroll_documents

급여명세서

* id
* employee_id
* pay_year
* pay_month
* gross_pay
* deduction_amount
* net_pay
* file_id
* created_at
* updated_at

### 36) tax_documents

원천징수영수증

* id
* employee_id
* tax_year
* file_id
* created_at
* updated_at

---

## G. ERP 인력운영 영역

### 37) client_companies

고객사

* id
* company_name
* business_no
* contact_name
* contact_mobile
* address
* note
* is_active

### 38) work_sites

현장관리

* id
* client_company_id
* site_name
* site_address
* site_manager_name
* site_manager_mobile
* work_type
* shift_type
* required_headcount
* dormitory_available
* commute_bus_available
* safety_training_required
* is_active

### 39) site_job_positions

현장별 모집 직무

* id
* work_site_id
* job_category_id
* required_count
* unit_price
* note

### 40) placements

배치관리

* id
* employee_id
* work_site_id
* site_job_position_id
* assigned_date
* end_date
* shift_group
* status
* note
* created_at

상태값

* ASSIGNED
* WORKING
* ENDED
* REPLACED

### 41) attendance_records

근태기록

* id
* employee_id
* work_site_id
* work_date
* attendance_status
* check_in_time
* check_out_time
* overtime_hours
* night_hours
* holiday_hours
* note

근태상태

* PRESENT
* LATE
* EARLY_LEAVE
* ABSENT
* HOLIDAY

### 42) payroll_base_records

급여기초 데이터

* id
* employee_id
* work_site_id
* pay_year
* pay_month
* base_hourly_wage
* work_days
* total_work_hours
* overtime_hours
* night_hours
* holiday_hours
* meal_allowance
* dormitory_deduction
* other_allowance
* other_deduction
* created_at

### 43) site_replacement_requests

대체인력 요청

* id
* work_site_id
* request_date
* required_count
* reason
* status
* requested_by
* created_at

상태값

* REQUESTED
* MATCHING
* COMPLETED
* CANCELED

---

## H. 외국인 / 비자관리 영역

### 44) visa_types

비자코드

* id
* visa_code
* visa_name
* description
* is_active

예시

* D2
* D4
* D10
* E7
* F2R
* F4
* H2

### 45) foreign_worker_profiles

외국인 추가정보

* id
* employee_id
* passport_no
* alien_reg_no_masked
* visa_type_id
* visa_expire_date
* work_permission_status
* school_name
* major
* korean_level
* weekly_work_limit_hours
* housing_needed
* note

### 46) visa_change_histories

비자 변경 이력

* id
* employee_id
* from_visa_type_id
* to_visa_type_id
* changed_at
* note

### 47) foreign_documents

외국인 관련 문서

* id
* employee_id
* doc_type
* file_id
* issue_date
* expire_date
* note

예시

* 여권
* 외국인등록증
* 체류자격서류
* 학력증명
* 자격증

---

## I. 파일 / 로그 / 공통 영역

### 48) files

공통 파일관리

* id
* original_name
* stored_name
* file_path
* file_ext
* file_size
* mime_type
* uploaded_by
* created_at

### 49) common_codes

공통 코드

* id
* group_code
* code
* code_name
* sort_order
* is_active

예시

* employment_type
* inquiry_status
* application_status
* attendance_status

### 50) activity_logs

공통 활동 로그

* id
* actor_type
* actor_id
* action_type
* target_table
* target_id
* description
* ip_address
* created_at

---

# 3. 핵심 관계 구조

## 채용 흐름

```text
job_posts
 └─ job_applications
     └─ applicants
         └─ applicant_resumes
```

## 직원 전환 흐름

```text
applicants
 → job_applications
 → employees
 → placements
 → attendance_records
 → payroll_base_records
 → payroll_documents
```

## 서류발급 흐름

```text
employees
 ├─ verification_requests
 ├─ issued_documents
 ├─ payroll_documents
 └─ tax_documents
```

## 외국인 관리 흐름

```text
employees
 └─ foreign_worker_profiles
     ├─ visa_types
     ├─ visa_change_histories
     └─ foreign_documents
```

---

# 4. 1차 개발에 실제 필요한 핵심 테이블

처음부터 50개 전부 개발하지 않아도 됩니다.
**1차 오픈 핵심 테이블**은 아래입니다.

### 홈페이지

* site_banners
* site_pages
* business_areas
* notices
* faqs

### 채용

* job_posts
* applicants
* job_applications

### 문의

* inquiries
* inquiry_memos

### 서류발급

* employees
* verification_requests
* document_templates
* issued_documents
* payroll_documents
* tax_documents

### 관리자

* admin_users
* admin_roles
* admin_role_permissions

즉, **1차 MVP는 약 18~20개 테이블**이면 충분합니다.

---

# 5. 2차 확장 테이블

ERP와 외국인 관리는 2차에 붙이면 됩니다.

* client_companies
* work_sites
* placements
* attendance_records
* payroll_base_records
* foreign_worker_profiles
* visa_change_histories
* foreign_documents

---

# 6. DB 설계 원칙

## 필수 원칙

* 모든 테이블에 `id`, `created_at`, `updated_at` 기본 적용
* 상태값은 enum 또는 공통코드 테이블로 통일
* 파일은 직접 컬럼 저장하지 말고 `files` 테이블 참조
* 민감정보는 마스킹 저장
* 삭제 대신 `is_active`, `status` 중심 운영 권장
* 발급문서/로그는 반드시 이력 보관

---

# 7. 권장 개발 순서

## 1차

* 관리자
* 홈페이지
* 채용공고
* 문의
* 직원
* 서류발급

## 2차

* ERP
* 현장관리
* 배치관리
* 근태
* 급여기초

## 3차

* 외국인 관리
* 비자 전환 관리
* 다국어
* 추천 매칭

---

다음 순서로 바로 이어서 **2단계: 채용 + ERP + 서류발급 통합 API 설계**로 진행하겠습니다.

원하시면 제가 다음 답변에서 바로
**REST API 전체 구조를 사용자/관리자/ERP로 나눠서 엔드포인트 목록까지** 만들어드리겠습니다.
