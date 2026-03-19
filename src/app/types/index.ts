/**
 * 공유 TypeScript 인터페이스 정의
 */

// ──── 관리자 ────
export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER";
  email?: string;
  created_at?: string;
}

// ──── 직원 ────
export interface Employee {
  id: string;
  employee_no: string;
  name: string;
  birth_date?: string;
  mobile?: string;
  email?: string;
  department?: string;
  position?: string;
  status: "ACTIVE" | "RESIGNED" | "LEAVE";
  hire_date?: string;
  nationality?: string;
  kakao_id?: string;
}

// ──── 채용 공고 ────
export interface JobPost {
  id: string;
  title: string;
  company_name?: string;
  job_category?: string;
  employment_type?: string;
  work_location?: string;
  working_hours?: string;
  salary_type?: string;
  salary_min?: number;
  salary_max?: number;
  recruitment_count?: number;
  dormitory_available?: boolean;
  foreigner_allowed?: boolean;
  description?: string;
  status?: string;
  created_at?: string;
}

// ──── 문의 ────
export interface Inquiry {
  id: string;
  inquiry_type: string;
  company_name?: string;
  name: string;
  mobile: string;
  email?: string;
  title: string;
  content: string;
  status: string;
  created_at?: string;
}

// ──── 지원자 ────
export interface Applicant {
  id: string;
  job_post_id?: string;
  name: string;
  mobile: string;
  email?: string;
  birth_date?: string;
  current_address?: string;
  desired_location?: string;
  desired_job?: string;
  career_summary?: string;
  self_intro?: string;
  status?: string;
  created_at?: string;
}

// ──── 회사 정보 ────
export interface CompanyInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  ceo_name?: string;
  business_number?: string;
  business_hours?: string;
  social_kakao?: string;
  social_blog?: string;
}

// ──── ERP ────
export interface ClientCompany {
  id: string;
  name: string;
  business_number?: string;
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  status?: string;
}

export interface WorkSite {
  id: string;
  client_company_id: string;
  name: string;
  address?: string;
  manager_name?: string;
  manager_phone?: string;
}

export interface Placement {
  id: string;
  employee_id: string;
  work_site_id: string;
  start_date: string;
  end_date?: string;
  status?: string;
}

// ──── 급여 ────
export interface Payslip {
  id: string;
  employee_id: string;
  pay_year_month: string;
  base_salary?: number;
  overtime_pay?: number;
  bonus?: number;
  total_deductions?: number;
  net_pay?: number;
  status: "DRAFT" | "CONFIRMED" | "SENT";
  confirmed_at?: string;
  sent_at?: string;
}

// ──── 비자 ────
export interface Visa {
  id: string;
  employee_id: string;
  visa_type: string;
  visa_number?: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
}

// ──── API 응답 ────
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ──── 배지 카운트 ────
export interface BadgeCounts {
  applicants?: number;
  inquiries?: number;
  documents?: number;
  [key: string]: number | undefined;
}
