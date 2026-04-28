/**
 * 더웰파트너 1차 MVP 시드 데이터
 * 실행: GET /make-server-c3ee322d/seed
 */
import * as db from "./db.ts";

export async function seedAll() {
  // 중복 시드 방지
  const existing = await db.findById("admin_roles", "role-super");
  if (existing) return { message: "이미 시드 데이터가 존재합니다." };

  const ts = db.now();

  // ──── A. 관리자/권한 ────
  const roles = [
    { id: "role-super", role_name: "최고관리자", role_code: "SUPER_ADMIN", description: "전체 메뉴 접근", permissions: ["dashboard","website","recruit","applicants","inquiries","employees","documents","statistics","erp","foreign","users","settings"] },
    { id: "role-web", role_name: "홈페이지 관리자", role_code: "WEBSITE_ADMIN", description: "홈페이지 콘텐츠 관리", permissions: ["dashboard","website"] },
    { id: "role-recruit", role_name: "채용 관리자", role_code: "RECRUIT_ADMIN", description: "채용/지원자 관리", permissions: ["dashboard","recruit","applicants","statistics"] },
    { id: "role-hr", role_name: "인사/서류 관리자", role_code: "HR_ADMIN", description: "직원/서류발급 관리", permissions: ["dashboard","employees","documents","erp","foreign","statistics"] },
    { id: "role-viewer", role_name: "조회 전용", role_code: "VIEWER", description: "데이터 열람만 가능", permissions: ["dashboard"] },
  ];
  await db.saveMany("admin_roles", roles);

  // 비밀번호 해싱 (SHA-256 + salt)
  const [hash1, hash2, hash3] = await Promise.all([
    db.hashPassword("admin1234"),
    db.hashPassword("recruit1234"),
    db.hashPassword("hr1234"),
  ]);

  const adminUsers = [
    { id: "admin-1", username: "admin", password_hash: hash1, name: "관리자", email: "admin@thewellpartner.com", mobile: "010-0000-0000", role_id: "role-super", status: "ACTIVE", last_login_at: ts, created_at: ts, updated_at: ts },
    { id: "admin-2", username: "recruit_mgr", password_hash: hash2, name: "이채용", email: "recruit@thewellpartner.com", mobile: "010-1111-2222", role_id: "role-recruit", status: "ACTIVE", last_login_at: null, created_at: ts, updated_at: ts },
    { id: "admin-3", username: "hr_mgr", password_hash: hash3, name: "박인사", email: "hr@thewellpartner.com", mobile: "010-3333-4444", role_id: "role-hr", status: "ACTIVE", last_login_at: null, created_at: ts, updated_at: ts },
  ];
  await db.saveMany("admin_users", adminUsers);

  // ──── B. 홈페이지 콘텐츠 ────
  const banners = [
    { id: "ban-1", title: "기업 맞춤 인력 솔루션", subtitle: "제조·물류·반도체 전 분야 인재파견 전문기업", button_text: "무료 상담 신청", button_link: "/contact", sort_order: 1, is_active: true, created_at: ts, updated_at: ts },
    { id: "ban-2", title: "함께 성장하는 파트너", subtitle: "고객사와 근로자 모두의 성공을 위한 최적의 솔루션", button_text: "사업분야 보기", button_link: "/business", sort_order: 2, is_active: true, created_at: ts, updated_at: ts },
    { id: "ban-3", title: "지금 바로 지원하세요", subtitle: "전국 다양한 일자리가 기다리고 있습니다", button_text: "채용정보 보기", button_link: "/recruit", sort_order: 3, is_active: true, created_at: ts, updated_at: ts },
  ];
  await db.saveMany("site_banners", banners);

  const notices = [
    { id: "ntc-1", title: "2025년 설 연휴 휴무 안내", content: "2025년 설 연휴(1/28~1/30) 기간 동안 본사 업무가 휴무입니다. 긴급 문의는 대표번호로 연락주세요.", is_pinned: true, view_count: 128, is_active: true, created_at: "2025-01-20T09:00:00Z", updated_at: "2025-01-20T09:00:00Z" },
    { id: "ntc-2", title: "화성 신규 현장 오픈 안내", content: "화성 반도체 클린룸 신규 현장이 오픈되었습니다. 관련 채용공고를 확인해주세요.", is_pinned: false, view_count: 85, is_active: true, created_at: "2025-02-10T09:00:00Z", updated_at: "2025-02-10T09:00:00Z" },
    { id: "ntc-3", title: "서류발급센터 리뉴얼 안내", content: "재직증명서, 급여명세서 등 온라인 서류발급 서비스가 리뉴얼되었습니다.", is_pinned: false, view_count: 62, is_active: true, created_at: "2025-02-25T09:00:00Z", updated_at: "2025-02-25T09:00:00Z" },
    { id: "ntc-4", title: "3월 안전교육 일정 안내", content: "각 현장별 3월 정기 안전교육 일정을 확인하시기 바랍니다.", is_pinned: true, view_count: 45, is_active: true, created_at: "2025-03-01T09:00:00Z", updated_at: "2025-03-01T09:00:00Z" },
  ];
  await db.saveMany("notices", notices);

  const faqs = [
    { id: "faq-1", category: "채용", question: "지원 후 얼마나 걸려야 연락을 받나요?", answer: "지원 후 영업일 기준 1~3일 이내에 담당자가 연락드립니다.", sort_order: 1, is_active: true, created_at: ts },
    { id: "faq-2", category: "채용", question: "외국인도 지원 가능한가요?", answer: "네, 취업 가능한 비자(E-7, F-2-R, H-2 등)를 소지하신 분은 지원 가능합니다.", sort_order: 2, is_active: true, created_at: ts },
    { id: "faq-3", category: "급여", question: "급여일은 언제인가요?", answer: "매월 10일에 급여가 지급됩니다. (공휴일인 경우 전 영업일 지급)", sort_order: 3, is_active: true, created_at: ts },
    { id: "faq-4", category: "서류", question: "재직증명서는 어떻게 발급받나요?", answer: "서류발급센터에서 본인인증 후 온라인으로 즉시 발급 가능합니다.", sort_order: 4, is_active: true, created_at: ts },
    { id: "faq-5", category: "기업", question: "인력 파견 최소 인원은?", answer: "최소 1명부터 파견이 가능합니다. 규모에 상관없이 상담 부탁드립니다.", sort_order: 5, is_active: true, created_at: ts },
    { id: "faq-6", category: "기업", question: "파견 단가는 어떻게 책정되나요?", answer: "직무, 근무형태, 인원수 등에 따라 맞춤 견적을 드립니다. 상담을 통해 안내해드립니다.", sort_order: 6, is_active: true, created_at: ts },
  ];
  await db.saveMany("faqs", faqs);

  // ──── C. 채용공고/지원자 ────
  const jobPosts = [
    { id: "job-1", title: "반도체 클린룸 생산직", company_name: "OO반도체", work_location: "경기도 화성시", job_category: "반도체", employment_type: "정규직", salary_type: "월급", salary_min: 3500000, salary_max: 4000000, working_hours: "주간 2교대 (06:00~18:00 / 18:00~06:00)", dormitory_available: true, commute_bus_available: true, foreigner_allowed: true, visa_note: "E-7, F-2-R 가능", recruitment_count: 20, description: "반도체 웨이퍼 가공 공정 작업. 클린룸 환경에서 장비 오퍼레이팅 및 검사 업무를 담당합니다.", qualification: "고졸 이상, 건강한 체력 보유자", preference: "반도체 경력자, 클린룸 경험자 우대", status: "OPEN", published_at: "2025-03-01T09:00:00Z", deadline_at: "2025-04-30T23:59:59Z", created_by: "admin-2", created_at: "2025-03-01T09:00:00Z", updated_at: "2025-03-01T09:00:00Z" },
    { id: "job-2", title: "자동차부품 생산직 (조립/검사)", company_name: "OO자동차부품", work_location: "경기도 화성시", job_category: "생산", employment_type: "정규직", salary_type: "월급", salary_min: 2800000, salary_max: 3200000, working_hours: "주간 상시 (08:00~17:00)", dormitory_available: true, commute_bus_available: true, foreigner_allowed: true, visa_note: "E-7 가능", recruitment_count: 50, description: "자동차 부품 조립, 용접, 검사 업무. 체계적인 교육 후 현장 배치됩니다.", qualification: "18세 이상, 초보 가능", preference: "제조업 경력자, 기숙사 입주 가능자 우대", status: "OPEN", published_at: "2025-03-05T09:00:00Z", deadline_at: "2025-04-15T23:59:59Z", created_by: "admin-2", created_at: "2025-03-05T09:00:00Z", updated_at: "2025-03-05T09:00:00Z" },
    { id: "job-3", title: "물류센터 상하차 작업자", company_name: "OO물류", work_location: "경기도 수원시", job_category: "물류", employment_type: "계약직", salary_type: "시급", salary_min: 12000, salary_max: 13000, working_hours: "주간 (09:00~18:00) / 야간 (20:00~05:00) 택1", dormitory_available: false, commute_bus_available: false, foreigner_allowed: true, visa_note: "비자 무관", recruitment_count: 10, description: "물류센터 내 상하차 및 분류 작업", qualification: "18세 이상", preference: "물류 경력자 우대", status: "OPEN", published_at: "2025-02-25T09:00:00Z", deadline_at: "2025-03-31T23:59:59Z", created_by: "admin-2", created_at: "2025-02-25T09:00:00Z", updated_at: "2025-02-25T09:00:00Z" },
    { id: "job-4", title: "사무 보조 직원", company_name: "OO기업", work_location: "경기도 수원시", job_category: "사무", employment_type: "계약직", salary_type: "월급", salary_min: 2500000, salary_max: 2500000, working_hours: "주간 (09:00~18:00)", dormitory_available: false, commute_bus_available: false, foreigner_allowed: false, visa_note: "", recruitment_count: 2, description: "일반 사무보조, 서류정리, 데이터입력 업무", qualification: "PC활용 가능자", preference: "사무경력자 우대", status: "CLOSED", published_at: "2025-02-15T09:00:00Z", deadline_at: "2025-03-10T23:59:59Z", created_by: "admin-2", created_at: "2025-02-15T09:00:00Z", updated_at: "2025-03-10T09:00:00Z" },
    { id: "job-5", title: "안전관리 담당자", company_name: "OO건설", work_location: "경기도 화성시", job_category: "안전관리", employment_type: "정규직", salary_type: "월급", salary_min: 3000000, salary_max: 3500000, working_hours: "주간 (08:00~17:00)", dormitory_available: false, commute_bus_available: true, foreigner_allowed: false, visa_note: "", recruitment_count: 3, description: "건설현장 안전관리, 안전교육, 안전점검 업무", qualification: "산업안전기사 자격증 보유자", preference: "건설업 안전관리 경력 3년 이상 우대", status: "OPEN", published_at: "2025-03-08T09:00:00Z", deadline_at: null, created_by: "admin-2", created_at: "2025-03-08T09:00:00Z", updated_at: "2025-03-08T09:00:00Z" },
    { id: "job-6", title: "빌딩 경비원", company_name: "OO빌딩관리", work_location: "경기도 수원시", job_category: "경비", employment_type: "정규직", salary_type: "월급", salary_min: 2400000, salary_max: 2600000, working_hours: "24시간 교대 (주간/야간)", dormitory_available: false, commute_bus_available: false, foreigner_allowed: false, visa_note: "", recruitment_count: 4, description: "빌딩 경비, 출입통제, 주차관리, 순찰", qualification: "60세 이하, 건강한 체력", preference: "경비 경력자, 보안 자격증 보유자 우대", status: "OPEN", published_at: "2025-03-03T09:00:00Z", deadline_at: "2025-04-20T23:59:59Z", created_by: "admin-2", created_at: "2025-03-03T09:00:00Z", updated_at: "2025-03-03T09:00:00Z" },
    { id: "job-7", title: "전자부품 조립 작업자", company_name: "OO전자", work_location: "경기도 화성시", job_category: "생산", employment_type: "계약직", salary_type: "월급", salary_min: 2600000, salary_max: 3000000, working_hours: "주간 2교대", dormitory_available: true, commute_bus_available: true, foreigner_allowed: true, visa_note: "E-7, H-2 가능", recruitment_count: 15, description: "전자부품 SMT 조립 및 외관 검사", qualification: "시력 양호, 세밀한 작업 가능자", preference: "전자부품 조립 경험자 우대", status: "OPEN", published_at: "2025-02-28T09:00:00Z", deadline_at: "2025-04-10T23:59:59Z", created_by: "admin-2", created_at: "2025-02-28T09:00:00Z", updated_at: "2025-02-28T09:00:00Z" },
    { id: "job-8", title: "품질관리 검사원", company_name: "OO품질", work_location: "경기도 수원시", job_category: "생산", employment_type: "정규직", salary_type: "월급", salary_min: 2800000, salary_max: 3000000, working_hours: "주간 (08:30~17:30)", dormitory_available: false, commute_bus_available: false, foreigner_allowed: false, visa_note: "", recruitment_count: 3, description: "제품 품질 검사, 불량 분석, 검사성적서 작성", qualification: "품질관리 경력 1년 이상", preference: "QC 관련 자격증 보유자 우대", status: "HIDDEN", published_at: null, deadline_at: null, created_by: "admin-2", created_at: "2025-03-09T09:00:00Z", updated_at: "2025-03-09T09:00:00Z" },
  ];
  await db.saveMany("job_posts", jobPosts);

  const applicants = [
    { id: "app-1", name: "이승호", mobile: "010-1234-5678", email: "seungho@email.com", birth_date: "1995-03-12", gender: "M", nationality: "한국", current_address: "경기도 화성시", desired_location: "화성시", desired_job: "반도체", career_summary: "반도체 생산직 3년", visa_type: null, korean_level: null, dormitory_needed: true, shift_available: true, created_at: "2025-03-11T10:00:00Z", updated_at: "2025-03-11T10:00:00Z" },
    { id: "app-2", name: "Nguyen Van A", mobile: "010-9876-5432", email: "nguyen.a@email.com", birth_date: "1998-07-22", gender: "M", nationality: "베트남", current_address: "경기도 수원시", desired_location: "화성시", desired_job: "생산", career_summary: "무경력", visa_type: "E-7", korean_level: "중급", dormitory_needed: true, shift_available: true, created_at: "2025-03-11T11:00:00Z", updated_at: "2025-03-11T11:00:00Z" },
    { id: "app-3", name: "김현정", mobile: "010-5555-3333", email: "hyunjung@email.com", birth_date: "2000-01-15", gender: "F", nationality: "한국", current_address: "경기도 수원시", desired_location: "수원시", desired_job: "물류", career_summary: "무경력", visa_type: null, korean_level: null, dormitory_needed: false, shift_available: false, created_at: "2025-03-11T14:00:00Z", updated_at: "2025-03-11T14:00:00Z" },
    { id: "app-4", name: "장우진", mobile: "010-7777-8888", email: "woojin@email.com", birth_date: "1988-11-05", gender: "M", nationality: "한국", current_address: "경기도 화성시", desired_location: "화성시", desired_job: "안전관리", career_summary: "안전관리 5년 경력", visa_type: null, korean_level: null, dormitory_needed: false, shift_available: false, created_at: "2025-03-10T09:00:00Z", updated_at: "2025-03-10T09:00:00Z" },
    { id: "app-5", name: "Tran Thi B", mobile: "010-2222-4444", email: "tran.b@email.com", birth_date: "1999-05-20", gender: "F", nationality: "베트남", current_address: "서울시 금천구", desired_location: "수원시", desired_job: "사무", career_summary: "무경력", visa_type: "D-10", korean_level: "중급", dormitory_needed: false, shift_available: false, created_at: "2025-03-10T11:00:00Z", updated_at: "2025-03-10T11:00:00Z" },
    { id: "app-6", name: "박민수", mobile: "010-6666-1111", email: "minsu.park@email.com", birth_date: "1997-08-30", gender: "M", nationality: "한국", current_address: "경기도 화성시", desired_location: "화성시", desired_job: "생산", career_summary: "전자부품 조립 1년", visa_type: null, korean_level: null, dormitory_needed: true, shift_available: true, created_at: "2025-03-10T15:00:00Z", updated_at: "2025-03-10T15:00:00Z" },
    { id: "app-7", name: "최지영", mobile: "010-3333-7777", email: "jiyoung.choi@email.com", birth_date: "1993-04-18", gender: "F", nationality: "한국", current_address: "경기도 수원시", desired_location: "수원시", desired_job: "생산", career_summary: "품질관리 2년", visa_type: null, korean_level: null, dormitory_needed: false, shift_available: true, created_at: "2025-03-09T10:00:00Z", updated_at: "2025-03-09T10:00:00Z" },
    { id: "app-8", name: "정해민", mobile: "010-8888-2222", email: "haemin@email.com", birth_date: "1975-06-10", gender: "M", nationality: "한국", current_address: "경기도 수원시", desired_location: "수원시", desired_job: "경비", career_summary: "경비 경력 10년", visa_type: null, korean_level: null, dormitory_needed: false, shift_available: true, created_at: "2025-03-09T14:00:00Z", updated_at: "2025-03-09T14:00:00Z" },
    { id: "app-9", name: "李天明", mobile: "010-4444-6666", email: "tianming@email.com", birth_date: "2001-02-28", gender: "M", nationality: "중국", current_address: "경기도 안산시", desired_location: "화성시", desired_job: "반도체", career_summary: "무경력", visa_type: "D-2", korean_level: "초급", dormitory_needed: true, shift_available: true, created_at: "2025-03-08T09:00:00Z", updated_at: "2025-03-08T09:00:00Z" },
    { id: "app-10", name: "한수연", mobile: "010-1111-9999", email: "suyeon@email.com", birth_date: "1996-12-03", gender: "F", nationality: "한국", current_address: "경기도 수원시", desired_location: "수원시", desired_job: "사무", career_summary: "사무보조 1년", visa_type: null, korean_level: null, dormitory_needed: false, shift_available: false, created_at: "2025-03-08T11:00:00Z", updated_at: "2025-03-08T11:00:00Z" },
  ];
  await db.saveMany("applicants", applicants);

  const jobApplications = [
    { id: "ja-1", job_post_id: "job-1", applicant_id: "app-1", status: "APPLIED", memo: "", applied_at: "2025-03-11T10:05:00Z", updated_at: "2025-03-11T10:05:00Z" },
    { id: "ja-2", job_post_id: "job-2", applicant_id: "app-2", status: "CONTACTED", memo: "3/12 전화예정", applied_at: "2025-03-11T11:10:00Z", updated_at: "2025-03-11T14:00:00Z" },
    { id: "ja-3", job_post_id: "job-3", applicant_id: "app-3", status: "APPLIED", memo: "", applied_at: "2025-03-11T14:05:00Z", updated_at: "2025-03-11T14:05:00Z" },
    { id: "ja-4", job_post_id: "job-5", applicant_id: "app-4", status: "INTERVIEW", memo: "3/14 면접 확정", applied_at: "2025-03-10T09:05:00Z", updated_at: "2025-03-11T10:00:00Z" },
    { id: "ja-5", job_post_id: "job-4", applicant_id: "app-5", status: "APPLIED", memo: "", applied_at: "2025-03-10T11:10:00Z", updated_at: "2025-03-10T11:10:00Z" },
    { id: "ja-6", job_post_id: "job-7", applicant_id: "app-6", status: "COUNSELED", memo: "기숙사 입주 가능 확인", applied_at: "2025-03-10T15:10:00Z", updated_at: "2025-03-11T09:00:00Z" },
    { id: "ja-7", job_post_id: "job-8", applicant_id: "app-7", status: "PASSED", memo: "3/15 출근 확정", applied_at: "2025-03-09T10:10:00Z", updated_at: "2025-03-11T15:00:00Z" },
    { id: "ja-8", job_post_id: "job-6", applicant_id: "app-8", status: "INTERVIEW", memo: "3/13 면접 완료", applied_at: "2025-03-09T14:10:00Z", updated_at: "2025-03-10T16:00:00Z" },
    { id: "ja-9", job_post_id: "job-1", applicant_id: "app-9", status: "FAILED", memo: "D-2 비자 취업불가", applied_at: "2025-03-08T09:10:00Z", updated_at: "2025-03-09T11:00:00Z" },
    { id: "ja-10", job_post_id: "job-4", applicant_id: "app-10", status: "HOLD", memo: "마감 후 검토", applied_at: "2025-03-08T11:10:00Z", updated_at: "2025-03-10T09:00:00Z" },
  ];
  await db.saveMany("job_applications", jobApplications);

  // ──── D. 문의/상담 ────
  const inquiries = [
    { id: "inq-1", inquiry_type: "COMPANY", company_name: "(주)삼성전자 부품", name: "김태호", mobile: "02-1234-5678", email: "kim@samsung-parts.com", title: "자동차부품 라인 인력 50명 필요", content: "2025년 4월부터 화성 공장 자동차부품 조립라인에 투입할 인력 50명이 필요합니다. 기숙사 제공 가능하며, 교대근무 가능한 인원 우선 요청드립니다.", status: "RECEIVED", is_starred: true, assigned_admin_id: null, created_at: "2025-03-11T09:30:00Z", updated_at: "2025-03-11T09:30:00Z" },
    { id: "inq-2", inquiry_type: "JOB_SEEKER", company_name: null, name: "김민수", mobile: "010-5555-1234", email: "minsu@email.com", title: "반도체 생산직 관련 문의", content: "반도체 생산직에 관심이 있습니다. 경력 없이도 지원 가능한지, 교육은 어떻게 진행되는지 알고 싶습니다.", status: "CHECKING", is_starred: false, assigned_admin_id: "admin-2", created_at: "2025-03-11T10:15:00Z", updated_at: "2025-03-11T14:00:00Z" },
    { id: "inq-3", inquiry_type: "COMPANY", company_name: "(주)LG화학", name: "박영미", mobile: "031-777-8888", email: "park@lgchem.com", title: "화성 물류센터 인력 20명 파견", content: "화성 물류센터에 상하차 및 분류 작업 인력 20명을 파견 요청합니다. 단기 3개월 계약 후 연장 검토 예정입니다.", status: "COUNSELED", is_starred: true, assigned_admin_id: "admin-2", created_at: "2025-03-10T11:00:00Z", updated_at: "2025-03-11T09:00:00Z" },
    { id: "inq-4", inquiry_type: "JOB_SEEKER", company_name: null, name: "박지영", mobile: "010-3333-4444", email: "jiyoung@email.com", title: "사무직 채용 관련 문의", content: "현재 사무직 채용 공고가 있는지 문의드립니다. 수원 지역 희망합니다.", status: "RECEIVED", is_starred: false, assigned_admin_id: null, created_at: "2025-03-10T14:30:00Z", updated_at: "2025-03-10T14:30:00Z" },
    { id: "inq-5", inquiry_type: "COMPANY", company_name: "(주)현대모비스", name: "최성진", mobile: "031-222-3333", email: "choi@mobis.com", title: "안전관리 담당자 3명 필요", content: "건설현장 안전관리 담당자 3명을 파견 요청합니다. 산업안전기사 자격증 보유자 필수입니다.", status: "RECEIVED", is_starred: false, assigned_admin_id: null, created_at: "2025-03-09T10:00:00Z", updated_at: "2025-03-09T10:00:00Z" },
    { id: "inq-6", inquiry_type: "PARTNERSHIP", company_name: "(주)만사인력", name: "한정석", mobile: "02-9999-8888", email: "han@mansa.com", title: "지역 협력 파트너 제안", content: "충남 지역 인력 파견 협력 파트너를 제안드립니다. 상호 협력 방안에 대해 논의하고 싶습니다.", status: "HOLD", is_starred: false, assigned_admin_id: "admin-1", created_at: "2025-03-09T15:00:00Z", updated_at: "2025-03-10T10:00:00Z" },
    { id: "inq-7", inquiry_type: "JOB_SEEKER", company_name: null, name: "Nguyen Van C", mobile: "010-6666-7777", email: "nguyen.c@email.com", title: "E-7 비자 취업 가능 여부 문의", content: "현재 E-7 비자를 가지고 있습니다. 생산직 취업이 가능한지, 어떤 서류가 필요한지 알고 싶습니다.", status: "COUNSELED", is_starred: false, assigned_admin_id: "admin-2", created_at: "2025-03-08T11:00:00Z", updated_at: "2025-03-09T14:00:00Z" },
    { id: "inq-8", inquiry_type: "COMPANY", company_name: "(주)SK하이닉스", name: "정우성", mobile: "031-444-5555", email: "jung@skhynix.com", title: "반도체 클린룸 인력 100명 긴급", content: "반도체 클린룸 인력 100명을 긴급 요청합니다. 가능한 빠른 시일 내 투입이 필요합니다.", status: "CLOSED", is_starred: true, assigned_admin_id: "admin-1", created_at: "2025-03-07T09:00:00Z", updated_at: "2025-03-10T17:00:00Z" },
  ];
  await db.saveMany("inquiries", inquiries);

  const inquiryMemos = [
    { id: "memo-1", inquiry_id: "inq-2", admin_user_id: "admin-2", memo: "전화 연결됨. 경력 관련 추가 안내 필요", created_at: "2025-03-11T14:30:00Z" },
    { id: "memo-2", inquiry_id: "inq-3", admin_user_id: "admin-2", memo: "단가 견적 발송 완료. 회신 대기 중", created_at: "2025-03-11T09:30:00Z" },
    { id: "memo-3", inquiry_id: "inq-7", admin_user_id: "admin-2", memo: "E-7 비자 확인 완료. 지원 안내 문자 발송", created_at: "2025-03-09T14:30:00Z" },
    { id: "memo-4", inquiry_id: "inq-8", admin_user_id: "admin-1", memo: "100명 중 70명 매칭 완료. 나머지 30명 추가 모집 진행중", created_at: "2025-03-09T11:00:00Z" },
    { id: "memo-5", inquiry_id: "inq-8", admin_user_id: "admin-1", memo: "100명 전원 배치 완료. 계약 종료", created_at: "2025-03-10T17:00:00Z" },
  ];
  await db.saveMany("inquiry_memos", inquiryMemos);

  // ──── E. 직원/부서/직급 ────
  const departments = [
    { id: "dept-1", name: "경영지원팀", sort_order: 1, is_active: true },
    { id: "dept-2", name: "생산팀", sort_order: 2, is_active: true },
    { id: "dept-3", name: "물류팀", sort_order: 3, is_active: true },
    { id: "dept-4", name: "반도체팀", sort_order: 4, is_active: true },
    { id: "dept-5", name: "안전관리팀", sort_order: 5, is_active: true },
    { id: "dept-6", name: "품질관리팀", sort_order: 6, is_active: true },
  ];
  await db.saveMany("departments", departments);

  const positions = [
    { id: "pos-1", name: "사원", sort_order: 1, is_active: true },
    { id: "pos-2", name: "주임", sort_order: 2, is_active: true },
    { id: "pos-3", name: "대리", sort_order: 3, is_active: true },
    { id: "pos-4", name: "과장", sort_order: 4, is_active: true },
    { id: "pos-5", name: "팀장", sort_order: 5, is_active: true },
  ];
  await db.saveMany("positions", positions);

  const employees = [
    { id: "emp-1", employee_no: "EMP-001", name: "박성민", birth_date: "1990-05-15", mobile: "010-1111-2222", email: "park@thewellpartner.com", department_id: "dept-2", department_name: "생산팀", position_id: "pos-5", position_name: "팀장", employment_status: "ACTIVE", hire_date: "2020-03-01", resign_date: null, employment_type: "정규직", nationality: "한국", address: "경기도 화성시", site_name: "OO자동차부품", created_at: "2020-03-01T09:00:00Z", updated_at: ts },
    { id: "emp-2", employee_no: "EMP-002", name: "김영수", birth_date: "1988-11-23", mobile: "010-3333-4444", email: "kim@thewellpartner.com", department_id: "dept-3", department_name: "물류팀", position_id: "pos-2", position_name: "주임", employment_status: "ACTIVE", hire_date: "2021-06-15", resign_date: null, employment_type: "정규직", nationality: "한국", address: "경기도 수원시", site_name: "OO물류", created_at: "2021-06-15T09:00:00Z", updated_at: ts },
    { id: "emp-3", employee_no: "EMP-003", name: "이지은", birth_date: "1995-02-10", mobile: "010-5555-6666", email: "lee@thewellpartner.com", department_id: "dept-2", department_name: "생산팀", position_id: "pos-1", position_name: "사원", employment_status: "RESIGNED", hire_date: "2022-01-10", resign_date: "2025-02-28", employment_type: "계약직", nationality: "한국", address: "경기도 수원시", site_name: null, created_at: "2022-01-10T09:00:00Z", updated_at: "2025-02-28T09:00:00Z" },
    { id: "emp-4", employee_no: "EMP-004", name: "최동현", birth_date: "1992-08-05", mobile: "010-7777-8888", email: "choi@thewellpartner.com", department_id: "dept-4", department_name: "반도체팀", position_id: "pos-3", position_name: "대리", employment_status: "ACTIVE", hire_date: "2021-09-01", resign_date: null, employment_type: "정규직", nationality: "한국", address: "경기도 화성시", site_name: "OO반도체", created_at: "2021-09-01T09:00:00Z", updated_at: ts },
    { id: "emp-5", employee_no: "EMP-005", name: "정하나", birth_date: "1997-12-30", mobile: "010-9999-0000", email: "jung@thewellpartner.com", department_id: "dept-1", department_name: "경영지원팀", position_id: "pos-1", position_name: "사원", employment_status: "ACTIVE", hire_date: "2023-03-02", resign_date: null, employment_type: "정규직", nationality: "한국", address: "경기도 수원시", site_name: "본사", created_at: "2023-03-02T09:00:00Z", updated_at: ts },
    { id: "emp-6", employee_no: "EMP-006", name: "한수연", birth_date: "1991-06-18", mobile: "010-2222-3333", email: "han@thewellpartner.com", department_id: "dept-2", department_name: "생산팀", position_id: "pos-1", position_name: "사원", employment_status: "LEAVE", hire_date: "2022-07-01", resign_date: null, employment_type: "정규직", nationality: "한국", address: "경기도 수원시", site_name: null, created_at: "2022-07-01T09:00:00Z", updated_at: ts },
    { id: "emp-7", employee_no: "EMP-007", name: "장우진", birth_date: "1985-01-22", mobile: "010-4444-5555", email: "jang@thewellpartner.com", department_id: "dept-5", department_name: "안전관리팀", position_id: "pos-4", position_name: "과장", employment_status: "ACTIVE", hire_date: "2019-11-01", resign_date: null, employment_type: "정규직", nationality: "한국", address: "경기도 화성시", site_name: "OO건설", created_at: "2019-11-01T09:00:00Z", updated_at: ts },
    { id: "emp-8", employee_no: "EMP-008", name: "Nguyen Van D", birth_date: "1998-09-10", mobile: "010-6666-7777", email: "nguyen@thewellpartner.com", department_id: "dept-2", department_name: "생산팀", position_id: "pos-1", position_name: "사원", employment_status: "ACTIVE", hire_date: "2024-01-15", resign_date: null, employment_type: "계약직", nationality: "베트남", address: "경기도 화성시", site_name: "OO전자", created_at: "2024-01-15T09:00:00Z", updated_at: ts },
  ];
  await db.saveMany("employees", employees);

  // ──── F. 서류발급 ────
  const documentTemplates = [
    { id: "tpl-1", doc_type: "EMPLOYMENT_CERT", template_name: "재직증명서", version_no: "v2.1", is_active: true, created_at: "2025-01-15T09:00:00Z" },
    { id: "tpl-2", doc_type: "RESIGNATION_CERT", template_name: "퇴직증명서", version_no: "v1.3", is_active: true, created_at: "2024-12-10T09:00:00Z" },
    { id: "tpl-3", doc_type: "CAREER_CERT", template_name: "경력증명서", version_no: "v1.2", is_active: true, created_at: "2024-11-20T09:00:00Z" },
    { id: "tpl-4", doc_type: "PAYROLL", template_name: "급여명세서 양식", version_no: "v3.0", is_active: true, created_at: "2025-02-01T09:00:00Z" },
    { id: "tpl-5", doc_type: "TAX_CERT", template_name: "원천징수영수증 안내", version_no: "v1.0", is_active: false, created_at: "2024-10-15T09:00:00Z" },
  ];
  await db.saveMany("document_templates", documentTemplates);

  const issuedDocuments = [
    { id: "doc-1", employee_id: "emp-1", employee_name: "박성민", employee_no: "EMP-001", doc_type: "EMPLOYMENT_CERT", doc_type_name: "재직증명서", issue_status: "SUCCESS", request_ip: "192.168.1.101", download_count: 2, issued_at: "2025-03-11T14:23:00Z" },
    { id: "doc-2", employee_id: "emp-2", employee_name: "김영수", employee_no: "EMP-002", doc_type: "PAYROLL", doc_type_name: "급여명세서", issue_status: "SUCCESS", request_ip: "192.168.1.45", download_count: 1, issued_at: "2025-03-11T11:05:00Z" },
    { id: "doc-3", employee_id: "emp-3", employee_name: "이지은", employee_no: "EMP-003", doc_type: "CAREER_CERT", doc_type_name: "경력증명서", issue_status: "SUCCESS", request_ip: "175.223.12.55", download_count: 3, issued_at: "2025-03-10T16:42:00Z" },
    { id: "doc-4", employee_id: "emp-4", employee_name: "최동현", employee_no: "EMP-004", doc_type: "TAX_CERT", doc_type_name: "원천징수영수증", issue_status: "SUCCESS", request_ip: "192.168.1.78", download_count: 1, issued_at: "2025-03-10T09:15:00Z" },
    { id: "doc-5", employee_id: "emp-5", employee_name: "정하나", employee_no: "EMP-005", doc_type: "EMPLOYMENT_CERT", doc_type_name: "재직증명서", issue_status: "SUCCESS", request_ip: "192.168.1.32", download_count: 1, issued_at: "2025-03-09T15:30:00Z" },
    { id: "doc-6", employee_id: null, employee_name: "알 수 없음", employee_no: "-", doc_type: "EMPLOYMENT_CERT", doc_type_name: "재직증명서", issue_status: "FAILED", request_ip: "221.148.33.91", download_count: 0, issued_at: "2025-03-09T10:22:00Z" },
    { id: "doc-7", employee_id: "emp-6", employee_name: "한수연", employee_no: "EMP-006", doc_type: "PAYROLL", doc_type_name: "급여명세서", issue_status: "SUCCESS", request_ip: "192.168.1.55", download_count: 2, issued_at: "2025-03-08T14:10:00Z" },
    { id: "doc-8", employee_id: "emp-7", employee_name: "장우진", employee_no: "EMP-007", doc_type: "EMPLOYMENT_CERT", doc_type_name: "재직증명서", issue_status: "SUCCESS", request_ip: "192.168.1.120", download_count: 1, issued_at: "2025-03-08T09:45:00Z" },
    { id: "doc-9", employee_id: null, employee_name: "알 수 없음", employee_no: "-", doc_type: "TAX_CERT", doc_type_name: "원천징수영수증", issue_status: "FAILED", request_ip: "58.120.44.22", download_count: 0, issued_at: "2025-03-07T17:30:00Z" },
    { id: "doc-10", employee_id: "emp-8", employee_name: "Nguyen Van D", employee_no: "EMP-008", doc_type: "PAYROLL", doc_type_name: "급여명세서", issue_status: "SUCCESS", request_ip: "192.168.1.89", download_count: 1, issued_at: "2025-03-07T11:20:00Z" },
  ];
  await db.saveMany("issued_documents", issuedDocuments);

  const payrollDocuments = [
    { id: "pay-1", employee_id: "emp-1", employee_name: "박성민", employee_no: "EMP-001", pay_year: "2025", pay_month: "02", gross_pay: 3500000, deduction_amount: 420000, net_pay: 3080000, status: "업로드완료", created_at: "2025-03-05T09:00:00Z", updated_at: "2025-03-05T09:00:00Z" },
    { id: "pay-2", employee_id: "emp-2", employee_name: "김영수", employee_no: "EMP-002", pay_year: "2025", pay_month: "02", gross_pay: 2800000, deduction_amount: 336000, net_pay: 2464000, status: "업로드완료", created_at: "2025-03-05T09:00:00Z", updated_at: "2025-03-05T09:00:00Z" },
    { id: "pay-3", employee_id: "emp-4", employee_name: "최동현", employee_no: "EMP-004", pay_year: "2025", pay_month: "02", gross_pay: 3800000, deduction_amount: 456000, net_pay: 3344000, status: "업로드완료", created_at: "2025-03-05T09:00:00Z", updated_at: "2025-03-05T09:00:00Z" },
    { id: "pay-4", employee_id: "emp-5", employee_name: "정하나", employee_no: "EMP-005", pay_year: "2025", pay_month: "02", gross_pay: 2500000, deduction_amount: 300000, net_pay: 2200000, status: "업로드완료", created_at: "2025-03-05T09:00:00Z", updated_at: "2025-03-05T09:00:00Z" },
    { id: "pay-5", employee_id: "emp-7", employee_name: "장우진", employee_no: "EMP-007", pay_year: "2025", pay_month: "02", gross_pay: 3200000, deduction_amount: 384000, net_pay: 2816000, status: "업로드완료", created_at: "2025-03-05T09:00:00Z", updated_at: "2025-03-05T09:00:00Z" },
    { id: "pay-6", employee_id: "emp-8", employee_name: "Nguyen Van D", employee_no: "EMP-008", pay_year: "2025", pay_month: "02", gross_pay: 2600000, deduction_amount: 312000, net_pay: 2288000, status: "업로드완료", created_at: "2025-03-05T09:00:00Z", updated_at: "2025-03-05T09:00:00Z" },
  ];
  await db.saveMany("payroll_documents", payrollDocuments);

  // ──── G. ERP 인력운영 ────
  const clientCompanies = [
    { id: "cc-1", company_name: "(주)OO반도체", business_no: "123-45-67890", contact_name: "김철수", contact_mobile: "031-111-2222", address: "경기도 화성시 동탄산단로 100", note: "반도체 웨이퍼 생산", is_active: true, created_at: ts, updated_at: ts },
    { id: "cc-2", company_name: "(주)OO자동차부품", business_no: "234-56-78901", contact_name: "이영미", contact_mobile: "031-333-4444", address: "경기도 화성시 봉담읍 산단로 50", note: "자동차부품 조립 및 검사", is_active: true, created_at: ts, updated_at: ts },
    { id: "cc-3", company_name: "(주)OO물류", business_no: "345-67-89012", contact_name: "박준혁", contact_mobile: "031-555-6666", address: "경기도 수원시 권선구 물류로 200", note: "종합물류센터", is_active: true, created_at: ts, updated_at: ts },
    { id: "cc-4", company_name: "(주)OO전자", business_no: "456-78-90123", contact_name: "최민지", contact_mobile: "031-777-8888", address: "경기도 화성시 남양읍 전자로 30", note: "전자부품 SMT 조립", is_active: true, created_at: ts, updated_at: ts },
    { id: "cc-5", company_name: "(주)OO건설", business_no: "567-89-01234", contact_name: "한승우", contact_mobile: "031-999-0000", address: "경기도 화성시 동탄대로 55", note: "건설현장 안전관리", is_active: true, created_at: ts, updated_at: ts },
  ];
  await db.saveMany("client_companies", clientCompanies);

  const workSites = [
    { id: "ws-1", client_company_id: "cc-1", client_company_name: "(주)OO반도체", site_name: "화성 클린룸 A동", site_address: "경기도 화성시 동탄산단로 100 A동", site_manager_name: "김반도", site_manager_mobile: "010-1000-1000", work_type: "반도체", shift_type: "2교대", required_headcount: 50, current_headcount: 42, dormitory_available: true, commute_bus_available: true, safety_training_required: true, is_active: true, created_at: ts, updated_at: ts },
    { id: "ws-2", client_company_id: "cc-1", client_company_name: "(주)OO반도체", site_name: "화성 클린룸 B동", site_address: "경기도 화성시 동탄산단로 100 B동", site_manager_name: "이클린", site_manager_mobile: "010-2000-2000", work_type: "반도체", shift_type: "3교대", required_headcount: 30, current_headcount: 28, dormitory_available: true, commute_bus_available: true, safety_training_required: true, is_active: true, created_at: ts, updated_at: ts },
    { id: "ws-3", client_company_id: "cc-2", client_company_name: "(주)OO자동차부품", site_name: "봉담 조립라인", site_address: "경기도 화성시 봉담읍 산단로 50", site_manager_name: "박조립", site_manager_mobile: "010-3000-3000", work_type: "생산", shift_type: "주간상시", required_headcount: 80, current_headcount: 65, dormitory_available: true, commute_bus_available: true, safety_training_required: false, is_active: true, created_at: ts, updated_at: ts },
    { id: "ws-4", client_company_id: "cc-3", client_company_name: "(주)OO물류", site_name: "수원 물류센터", site_address: "경기도 수원시 권선구 물류로 200", site_manager_name: "최물류", site_manager_mobile: "010-4000-4000", work_type: "물류", shift_type: "주간/야간 택1", required_headcount: 20, current_headcount: 15, dormitory_available: false, commute_bus_available: false, safety_training_required: false, is_active: true, created_at: ts, updated_at: ts },
    { id: "ws-5", client_company_id: "cc-4", client_company_name: "(주)OO전자", site_name: "남양 SMT라인", site_address: "경기도 화성시 남양읍 전자로 30", site_manager_name: "정전자", site_manager_mobile: "010-5000-5000", work_type: "전자부품", shift_type: "2교대", required_headcount: 25, current_headcount: 22, dormitory_available: true, commute_bus_available: true, safety_training_required: false, is_active: true, created_at: ts, updated_at: ts },
    { id: "ws-6", client_company_id: "cc-5", client_company_name: "(주)OO건설", site_name: "동탄 건설현장", site_address: "경기도 화성시 동탄대로 55", site_manager_name: "한건설", site_manager_mobile: "010-6000-6000", work_type: "건설", shift_type: "주간", required_headcount: 10, current_headcount: 8, dormitory_available: false, commute_bus_available: true, safety_training_required: true, is_active: true, created_at: ts, updated_at: ts },
  ];
  await db.saveMany("work_sites", workSites);

  const placements = [
    { id: "plc-1", employee_id: "emp-1", employee_name: "박성민", employee_no: "EMP-001", work_site_id: "ws-3", site_name: "봉담 조립라인", client_name: "(주)OO자동차부품", assigned_date: "2023-01-15", end_date: null, shift_group: "DAY", status: "WORKING", note: "생산팀 팀장", created_at: ts },
    { id: "plc-2", employee_id: "emp-2", employee_name: "김영수", employee_no: "EMP-002", work_site_id: "ws-4", site_name: "수원 물류센터", client_name: "(주)OO물류", assigned_date: "2022-07-01", end_date: null, shift_group: "DAY", status: "WORKING", note: "", created_at: ts },
    { id: "plc-3", employee_id: "emp-4", employee_name: "최동현", employee_no: "EMP-004", work_site_id: "ws-1", site_name: "화성 클린룸 A동", client_name: "(주)OO반도체", assigned_date: "2022-10-01", end_date: null, shift_group: "DAY", status: "WORKING", note: "클린룸 경력자", created_at: ts },
    { id: "plc-4", employee_id: "emp-7", employee_name: "장우진", employee_no: "EMP-007", work_site_id: "ws-6", site_name: "동탄 건설현장", client_name: "(주)OO건설", assigned_date: "2020-01-01", end_date: null, shift_group: "DAY", status: "WORKING", note: "안전관리 책임자", created_at: ts },
    { id: "plc-5", employee_id: "emp-8", employee_name: "Nguyen Van D", employee_no: "EMP-008", work_site_id: "ws-5", site_name: "남양 SMT라인", client_name: "(주)OO전자", assigned_date: "2024-02-01", end_date: null, shift_group: "NIGHT", status: "WORKING", note: "", created_at: ts },
    { id: "plc-6", employee_id: "emp-3", employee_name: "이지은", employee_no: "EMP-003", work_site_id: "ws-3", site_name: "봉담 조립라인", client_name: "(주)OO자동차부품", assigned_date: "2022-01-10", end_date: "2025-02-28", shift_group: "DAY", status: "ENDED", note: "퇴직으로 배치 종료", created_at: ts },
  ];
  await db.saveMany("placements", placements);

  const attendanceRecords = [
    { id: "att-1", employee_id: "emp-1", employee_name: "박성민", employee_no: "EMP-001", work_site_id: "ws-3", site_name: "봉담 조립라인", work_date: "2025-03-11", attendance_status: "PRESENT", check_in_time: "08:00", check_out_time: "19:30", overtime_hours: 2.5, night_hours: 0, holiday_hours: 0, note: "", created_at: ts },
    { id: "att-2", employee_id: "emp-2", employee_name: "김영수", employee_no: "EMP-002", work_site_id: "ws-4", site_name: "수원 물류센터", work_date: "2025-03-11", attendance_status: "PRESENT", check_in_time: "09:00", check_out_time: "18:00", overtime_hours: 0, night_hours: 0, holiday_hours: 0, note: "", created_at: ts },
    { id: "att-3", employee_id: "emp-4", employee_name: "최동현", employee_no: "EMP-004", work_site_id: "ws-1", site_name: "화성 클린룸 A동", work_date: "2025-03-11", attendance_status: "PRESENT", check_in_time: "06:00", check_out_time: "18:00", overtime_hours: 2, night_hours: 0, holiday_hours: 0, note: "", created_at: ts },
    { id: "att-4", employee_id: "emp-7", employee_name: "장우진", employee_no: "EMP-007", work_site_id: "ws-6", site_name: "동탄 건설현장", work_date: "2025-03-11", attendance_status: "LATE", check_in_time: "09:15", check_out_time: "17:00", overtime_hours: 0, night_hours: 0, holiday_hours: 0, note: "지각", created_at: ts },
    { id: "att-5", employee_id: "emp-8", employee_name: "Nguyen Van D", employee_no: "EMP-008", work_site_id: "ws-5", site_name: "남양 SMT라인", work_date: "2025-03-11", attendance_status: "PRESENT", check_in_time: "18:00", check_out_time: "06:00", overtime_hours: 0, night_hours: 8, holiday_hours: 0, note: "", created_at: ts },
    { id: "att-6", employee_id: "emp-1", employee_name: "박성민", employee_no: "EMP-001", work_site_id: "ws-3", site_name: "봉담 조립라인", work_date: "2025-03-10", attendance_status: "PRESENT", check_in_time: "08:00", check_out_time: "17:00", overtime_hours: 0, night_hours: 0, holiday_hours: 0, note: "", created_at: ts },
    { id: "att-7", employee_id: "emp-2", employee_name: "김영수", employee_no: "EMP-002", work_site_id: "ws-4", site_name: "수원 물류센터", work_date: "2025-03-10", attendance_status: "ABSENT", check_in_time: null, check_out_time: null, overtime_hours: 0, night_hours: 0, holiday_hours: 0, note: "개인사유", created_at: ts },
    { id: "att-8", employee_id: "emp-4", employee_name: "최동현", employee_no: "EMP-004", work_site_id: "ws-1", site_name: "화성 클린룸 A동", work_date: "2025-03-10", attendance_status: "PRESENT", check_in_time: "06:00", check_out_time: "18:00", overtime_hours: 2, night_hours: 0, holiday_hours: 0, note: "", created_at: ts },
  ];
  await db.saveMany("attendance_records", attendanceRecords);

  // ──── H. 외국인 인력관리 (비자/체류) ────
  const foreignVisas = [
    { id: "visa-1", employee_id: "emp-8", employee_name: "Nguyen Van D", employee_no: "EMP-008", nationality: "베트남", visa_type: "E-9", visa_no: "V2024-88001", issue_date: "2024-01-10", expire_date: "2026-01-09", issue_authority: "수원출입국관리사무소", passport_no: "B12345678", stay_status: "ACTIVE", renewal_count: 0, note: "제조업 비전문취업", created_at: ts, updated_at: ts },
    { id: "visa-2", employee_id: null, employee_name: "Tran Thi Mai", employee_no: "EMP-EXT-001", nationality: "베트남", visa_type: "E-7", visa_no: "V2023-77002", issue_date: "2023-06-15", expire_date: "2025-06-14", issue_authority: "서울출입국관리사무소", passport_no: "C98765432", stay_status: "EXPIRING_SOON", renewal_count: 1, note: "특정활동 - 생산관리. 만료 임박", created_at: ts, updated_at: ts },
    { id: "visa-3", employee_id: null, employee_name: "Li Wei", employee_no: "EMP-EXT-002", nationality: "중국", visa_type: "H-2", visa_no: "V2024-66003", issue_date: "2024-05-20", expire_date: "2027-05-19", issue_authority: "인천출입국관리사무소", passport_no: "EA1234567", stay_status: "ACTIVE", renewal_count: 0, note: "방문취업 - 동포", created_at: ts, updated_at: ts },
    { id: "visa-4", employee_id: null, employee_name: "Pham Van Hoa", employee_no: "EMP-EXT-003", nationality: "베트남", visa_type: "E-9", visa_no: "V2022-55004", issue_date: "2022-03-01", expire_date: "2025-02-28", issue_authority: "수원출입국관리사무소", passport_no: "B87654321", stay_status: "EXPIRED", renewal_count: 0, note: "만료됨 - 갱신 필요", created_at: ts, updated_at: ts },
    { id: "visa-5", employee_id: null, employee_name: "Wang Xiaoming", employee_no: "EMP-EXT-004", nationality: "중국", visa_type: "F-2-R", visa_no: "V2023-44005", issue_date: "2023-08-10", expire_date: "2028-08-09", issue_authority: "서울출입국관리사무소", passport_no: "EA9876543", stay_status: "ACTIVE", renewal_count: 0, note: "거주 비자 - 점수제", created_at: ts, updated_at: ts },
    { id: "visa-6", employee_id: null, employee_name: "Akhmetov Bek", employee_no: "EMP-EXT-005", nationality: "우즈베키스탄", visa_type: "E-9", visa_no: "V2024-33006", issue_date: "2024-09-01", expire_date: "2026-08-31", issue_authority: "안산출입국관리사무소", passport_no: "AA1122334", stay_status: "ACTIVE", renewal_count: 0, note: "제조업 비전문취업", created_at: ts, updated_at: ts },
    { id: "visa-7", employee_id: null, employee_name: "Srey Sophea", employee_no: "EMP-EXT-006", nationality: "캄보디아", visa_type: "E-9", visa_no: "V2024-22007", issue_date: "2024-04-15", expire_date: "2025-10-14", issue_authority: "수원출입국관리사무소", passport_no: "N5566778", stay_status: "EXPIRING_SOON", renewal_count: 0, note: "만료 6개월 이내", created_at: ts, updated_at: ts },
    { id: "visa-8", employee_id: null, employee_name: "Bayarmaa Dorj", employee_no: "EMP-EXT-007", nationality: "몽골", visa_type: "H-2", visa_no: "V2023-11008", issue_date: "2023-11-20", expire_date: "2026-11-19", issue_authority: "인천출입국관리사무소", passport_no: "E2233445", stay_status: "ACTIVE", renewal_count: 1, note: "방문취업 재발급", created_at: ts, updated_at: ts },
  ];
  await db.saveMany("foreign_visas", foreignVisas);

  const foreignStayRecords = [
    { id: "stay-1", visa_id: "visa-1", employee_name: "Nguyen Van D", action_type: "ENTRY", action_date: "2024-01-15", stay_status_before: null, stay_status_after: "ACTIVE", authority: "인천공항", note: "최초 입국", created_at: ts },
    { id: "stay-2", visa_id: "visa-2", employee_name: "Tran Thi Mai", action_type: "RENEWAL", action_date: "2024-06-10", stay_status_before: "EXPIRING_SOON", stay_status_after: "ACTIVE", authority: "서울출입국관리사무소", note: "1년 연장 완료", created_at: ts },
    { id: "stay-3", visa_id: "visa-2", employee_name: "Tran Thi Mai", action_type: "STATUS_CHECK", action_date: "2025-03-01", stay_status_before: "ACTIVE", stay_status_after: "EXPIRING_SOON", authority: "시스템 자동", note: "만료 3개월 이내 경고", created_at: ts },
    { id: "stay-4", visa_id: "visa-4", employee_name: "Pham Van Hoa", action_type: "EXPIRED", action_date: "2025-03-01", stay_status_before: "EXPIRING_SOON", stay_status_after: "EXPIRED", authority: "시스템 자동", note: "비자 만료 - 갱신 미이행", created_at: ts },
    { id: "stay-5", visa_id: "visa-3", employee_name: "Li Wei", action_type: "ENTRY", action_date: "2024-05-25", stay_status_before: null, stay_status_after: "ACTIVE", authority: "인천공항", note: "입국", created_at: ts },
    { id: "stay-6", visa_id: "visa-6", employee_name: "Akhmetov Bek", action_type: "ENTRY", action_date: "2024-09-05", stay_status_before: null, stay_status_after: "ACTIVE", authority: "인천공항", note: "최초 입국", created_at: ts },
    { id: "stay-7", visa_id: "visa-8", employee_name: "Bayarmaa Dorj", action_type: "RENEWAL", action_date: "2023-11-20", stay_status_before: "EXPIRING_SOON", stay_status_after: "ACTIVE", authority: "인천출입국관리사무소", note: "H-2 재발급", created_at: ts },
  ];
  await db.saveMany("foreign_stay_records", foreignStayRecords);

  return { message: "시드 데이터 생성 완료 (ERP + 외국인관리 포함)", tables: { admin_roles: roles.length, admin_users: adminUsers.length, site_banners: banners.length, notices: notices.length, faqs: faqs.length, job_posts: jobPosts.length, applicants: applicants.length, job_applications: jobApplications.length, inquiries: inquiries.length, inquiry_memos: inquiryMemos.length, departments: departments.length, positions: positions.length, employees: employees.length, document_templates: documentTemplates.length, issued_documents: issuedDocuments.length, payroll_documents: payrollDocuments.length, client_companies: clientCompanies.length, work_sites: workSites.length, placements: placements.length, attendance_records: attendanceRecords.length, foreign_visas: foreignVisas.length, foreign_stay_records: foreignStayRecords.length } };
}
