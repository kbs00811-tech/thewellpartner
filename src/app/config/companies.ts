/**
 * 업체별 처리 — 회사 마스터 데이터
 *
 * 회사별로 출근부/청구 폼이 다르기 때문에 백엔드에 company_id를 함께 전달.
 * 추가할 때: 아래 배열에 한 줄 추가만 하면 사이드바 + 라우트 + API에 자동 반영됩니다.
 *
 * 운영 회사 수가 20개를 넘어가면 DB 마스터 테이블로 마이그레이션 권장.
 */

export interface CompanyConfig {
  /** 백엔드 분기/파일명 prefix에 쓰는 짧은 식별자 (영문 소문자) */
  id: string;
  /** 사이드바·헤더 표시 이름 (한글) */
  name: string;
  /** 옵션 — 회사 설명 (헤더 부제) */
  description?: string;
  /** 활성 여부 — false 면 메뉴 비노출 */
  active: boolean;
}

export const COMPANIES: CompanyConfig[] = [
  {
    id: "lty",
    name: "엘티와이",
    description: "(주)엘티와이 출근부 자동입력",
    active: true,
  },
  // 새 회사 추가 예시:
  // { id: "samsung", name: "삼성", description: "...", active: true },
];

export function getCompany(id: string): CompanyConfig | undefined {
  return COMPANIES.find((c) => c.id === id);
}

export function getActiveCompanies(): CompanyConfig[] {
  return COMPANIES.filter((c) => c.active);
}
