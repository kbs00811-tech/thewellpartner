/**
 * CSV 내보내기 유틸리티
 * 배열 데이터를 CSV 파일로 변환하여 다운로드합니다.
 */

export interface CsvColumn {
  key: string;
  label: string;
  /** 값 변환 함수 (선택) */
  transform?: (value: any, row: any) => string;
}

function escapeCell(val: any): string {
  const str = val == null ? "" : String(val);
  // 쉼표, 줄바꿈, 따옴표가 포함되면 따옴표로 감싸기
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function arrayToCsv(data: any[], columns: CsvColumn[]): string {
  // BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const header = columns.map((col) => escapeCell(col.label)).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const val = col.transform ? col.transform(raw, row) : raw;
        return escapeCell(val);
      })
      .join(",")
  );
  return bom + [header, ...rows].join("\n");
}

export function downloadCsv(data: any[], columns: CsvColumn[], filename: string) {
  const csv = arrayToCsv(data, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ──── 사전 정의된 내보내기 스키마 ──── */

export const EMPLOYEE_COLUMNS: CsvColumn[] = [
  { key: "employee_no", label: "사번" },
  { key: "name", label: "이름" },
  { key: "birth_date", label: "생년월일" },
  { key: "mobile", label: "연락처" },
  { key: "email", label: "이메일" },
  { key: "department_name", label: "부서" },
  { key: "position_name", label: "직위" },
  { key: "hire_date", label: "입사일" },
  { key: "employment_status", label: "상태" },
  { key: "employment_type", label: "고용형태" },
  { key: "nationality", label: "국적" },
  { key: "assigned_site", label: "배치현장" },
];

export const INQUIRY_COLUMNS: CsvColumn[] = [
  { key: "name", label: "이름" },
  { key: "company_name", label: "회사명" },
  { key: "phone", label: "연락처" },
  { key: "email", label: "이메일" },
  { key: "inquiry_type", label: "유형" },
  { key: "status", label: "상태" },
  { key: "message", label: "내용" },
  { key: "created_at", label: "접수일", transform: (v) => v?.split("T")[0] || "" },
];

export const APPLICANT_COLUMNS: CsvColumn[] = [
  { key: "name", label: "이름" },
  { key: "mobile", label: "연락처" },
  { key: "email", label: "이메일" },
  { key: "nationality", label: "국적" },
  { key: "career_summary", label: "경력" },
  { key: "desired_location", label: "희망지역" },
  { key: "created_at", label: "등록일", transform: (v) => v?.split("T")[0] || "" },
];

export const ISSUED_DOC_COLUMNS: CsvColumn[] = [
  { key: "employee_name", label: "이름" },
  { key: "employee_no", label: "사번" },
  { key: "doc_type_name", label: "문서종류" },
  { key: "issued_at", label: "발급일시", transform: (v) => v?.replace("T", " ").slice(0, 16) || "" },
  { key: "request_ip", label: "IP" },
  { key: "issue_status", label: "결과" },
  { key: "download_count", label: "다운로드수" },
];

export const PAYSLIP_COLUMNS: CsvColumn[] = [
  { key: "employee_no", label: "사번" },
  { key: "employee_name", label: "이름" },
  { key: "pay_year", label: "연도" },
  { key: "pay_month", label: "월" },
  { key: "gross_pay", label: "총지급액" },
  { key: "deduction_amount", label: "공제액" },
  { key: "net_pay", label: "실수령액" },
  { key: "status", label: "상태" },
];

export const JOB_APPLICATION_COLUMNS: CsvColumn[] = [
  { key: "applicant_name", label: "지원자" },
  { key: "applicant_mobile", label: "연락처" },
  { key: "job_title", label: "공고명" },
  { key: "status", label: "상태" },
  { key: "created_at", label: "지원일", transform: (v) => v?.split("T")[0] || "" },
];
