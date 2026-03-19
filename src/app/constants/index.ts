/**
 * 공유 상수 정의
 * 여러 페이지에서 중복 사용되는 라벨, 옵션, 상태값을 중앙 관리
 */

// ──── 관리자 경로 접두사 ────
export const ADMIN_BASE = "/manage-twp";

// ──── 문의 유형 ────
export const INQUIRY_TYPES = {
  COMPANY: "COMPANY",
  JOB_SEEKER: "JOB_SEEKER",
  PARTNERSHIP: "PARTNERSHIP",
} as const;

export const INQUIRY_TYPE_LABELS: Record<string, string> = {
  COMPANY: "기업 문의",
  JOB_SEEKER: "구직자 문의",
  PARTNERSHIP: "제휴 문의",
};

// ──── 문의 상태 ────
export const INQUIRY_STATUS = {
  RECEIVED: "RECEIVED",
  CHECKING: "CHECKING",
  COUNSELED: "COUNSELED",
  CLOSED: "CLOSED",
} as const;

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "접수",
  CHECKING: "확인중",
  COUNSELED: "상담완료",
  CLOSED: "종료",
};

export const INQUIRY_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  RECEIVED: { bg: "bg-blue-50", text: "text-blue-600" },
  CHECKING: { bg: "bg-amber-50", text: "text-amber-600" },
  COUNSELED: { bg: "bg-green-50", text: "text-green-600" },
  CLOSED: { bg: "bg-gray-50", text: "text-gray-500" },
};

// ──── 직원 상태 ────
export const EMPLOYEE_STATUS = {
  ACTIVE: "ACTIVE",
  RESIGNED: "RESIGNED",
  LEAVE: "LEAVE",
} as const;

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "재직",
  RESIGNED: "퇴직",
  LEAVE: "휴직",
};

// ──── 고용 형태 ────
export const EMPLOYMENT_TYPES = ["정규직", "계약직", "파견직", "일용직", "인턴"] as const;

// ──── 직무 카테고리 ────
export const JOB_CATEGORIES = [
  "제조/생산",
  "물류/유통",
  "반도체",
  "사무직",
  "안전감시",
  "경비/청소",
  "기타",
] as const;

// ──── 지역 옵션 ────
export const REGION_OPTIONS = [
  "서울", "경기", "인천", "수원", "화성", "평택",
  "대전", "세종", "충남", "충북",
  "부산", "대구", "울산", "경남", "경북",
  "광주", "전남", "전북", "제주",
] as const;

// ──── 급여 관련 ────
export const PAYROLL_STATUS = {
  DRAFT: "DRAFT",
  CONFIRMED: "CONFIRMED",
  SENT: "SENT",
} as const;

export const PAYROLL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "임시저장",
  CONFIRMED: "확정",
  SENT: "발송완료",
};

// ──── 관리자 역할 ────
export const ADMIN_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
} as const;

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "최고관리자",
  ADMIN: "관리자",
  MANAGER: "매니저",
};

// ──── 비자 상태 ────
export const VISA_STATUS_LABELS: Record<string, string> = {
  VALID: "유효",
  EXPIRING_SOON: "곧 만료",
  EXPIRED: "만료",
  RENEWAL_IN_PROGRESS: "갱신중",
};

// ──── 페이지네이션 ────
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
