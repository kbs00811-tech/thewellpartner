/**
 * 도급/파견 양식 생성용 공통 타입
 * - 계약 형태별 분기 (인적 도급 / 생산 도급 / 인력 파견)
 */

export type ContractType =
  | "PERSONAL_OUTSOURCING"  // 인적 도급
  | "PRODUCTION_OUTSOURCING" // 생산 도급
  | "DISPATCH";              // 인력 파견

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  PERSONAL_OUTSOURCING: "인적 도급",
  PRODUCTION_OUTSOURCING: "생산 도급",
  DISPATCH: "인력 파견",
};

export const CONTRACT_TYPE_DESC: Record<ContractType, string> = {
  PERSONAL_OUTSOURCING: "업무 수행에 필요한 인력 운영을 도급",
  PRODUCTION_OUTSOURCING: "특정 제품/생산물의 일정 수량 완성을 도급",
  DISPATCH: "근로자 파견사업 (파견법 제2조)",
};

// 회사(공급자) 정보
export interface CompanyInfo {
  name: string;          // 주식회사 더웰파트너
  ceoName: string;       // 김범석
  businessNo: string;    // 265-88-01190
  address: string;       // 경기도 수원시 권선구 경수대로 371 2층
  phone: string;         // 1666-7663
  email: string;         // 2021thewell@gmail.com
  sealUrl?: string;      // 직인 이미지 URL
}

// 고객사(공급받는자) 정보
export interface ClientInfo {
  name: string;
  ceoName: string;
  businessNo: string;
  address: string;
  phone?: string;
  contactPerson?: string;
}

// 계약서 데이터
export interface ContractData {
  contractType: ContractType;
  contractNo: string;             // 계약 번호 (TWP-CON-YYYY-NNNN)
  contractDate: string;           // 계약 체결일
  startDate: string;              // 도급/파견 시작일
  endDate: string;                // 종료일
  workSite: string;               // 작업 장소
  workDescription: string;        // 업무 내용
  totalAmount?: number;           // 총 도급금액 (없으면 단가표)
  paymentTerm: string;            // 지급 조건 (예: 매월 말일 마감, 익월 10일 지급)

  // 인적 도급 전용
  personalDetails?: {
    headcount: number;            // 투입 인원
    workHoursPerDay: number;      // 일 근로시간
    workDaysPerWeek: number;      // 주 근로일
    siteManager: string;          // 현장 책임자 (도급사 측)
    rateTable: Array<{ jobCategory: string; ratePerHour: number; headcount: number }>;
  };

  // 생산 도급 전용
  productionDetails?: {
    productName: string;          // 생산 제품명
    targetQuantity: number;       // 목표 수량
    qualityStandard: string;      // 품질 기준
    rateTable: Array<{ productSpec: string; unitRate: number; quantity?: number }>;
  };

  // 파견 전용 (파견법 제20조)
  dispatchDetails?: {
    dispatchPeriod: string;       // 파견기간
    workTime: string;             // 시업·종업 시각
    restTime: string;             // 휴게시간
    holiday: string;              // 휴일
    dispatchFee: number;          // 파견수수료
    workerWage: number;           // 파견근로자 임금
    userBusinessName: string;     // 사용사업주 사업장 명
    userManagerName: string;      // 사용사업주 측 관리자
    safetyManager: string;        // 안전보건책임자
  };
}

// 청구서 데이터
export interface InvoiceData {
  contractType: ContractType;
  invoiceNo: string;
  invoiceDate: string;
  yearMonth: string;
  dueDate: string;

  items: Array<{
    description: string;          // 품목 (인적: 직무, 생산: 제품, 파견: 사용사업주)
    quantity: number;             // 수량/시간
    unit: string;                 // 시간/개/명
    unitPrice: number;            // 단가
    amount: number;               // 금액
    spec?: string;                // 규격
  }>;

  subtotal: number;               // 공급가액
  vatAmount: number;              // 부가세 (10%)
  total: number;                  // 합계금액

  // 파견 전용 분리
  dispatchBreakdown?: {
    wageAmount: number;           // 임금분
    feeAmount: number;            // 수수료분 (과세)
  };

  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

// 세금계산서 데이터 (전자세금계산서 표준)
export interface TaxInvoiceData {
  contractType: ContractType;
  taxInvoiceNo: string;           // 승인번호
  issueDate: string;              // 작성일자
  yearMonth: string;
  items: Array<{
    monthDay: string;             // 월/일
    description: string;          // 품목
    spec: string;                 // 규격
    quantity: number;             // 수량
    unitPrice: number;            // 단가
    supplyAmount: number;         // 공급가액
    taxAmount: number;            // 세액
    note?: string;                // 비고
  }>;
  totalSupplyAmount: number;      // 공급가액 합계
  totalTaxAmount: number;         // 세액 합계
  totalAmount: number;            // 합계금액
  cashAmount?: number;            // 현금
  checkAmount?: number;           // 수표
  noteAmount?: number;            // 어음
  creditAmount?: number;          // 외상미수금
  receiptType: "영수" | "청구";   // 영수 / 청구
}

// 급여명세서 데이터
export interface PayslipData {
  employeeName: string;
  employeeNo: string;
  department: string;
  position: string;
  contractType: ContractType;     // 계약 형태 (파견의 경우 사용사업주 표기)
  userBusinessName?: string;      // 파견 사용사업주
  yearMonth: string;
  payDate: string;

  // 지급 항목
  payments: {
    basicPay: number;             // 기본급
    overtimePay: number;          // 연장근로수당
    nightPay: number;             // 야간근로수당
    holidayPay: number;           // 휴일근로수당
    bonus: number;                // 상여금
    otherPay: number;             // 기타
  };

  // 공제 항목
  deductions: {
    nationalPension: number;      // 국민연금
    healthInsurance: number;      // 건강보험
    longTermCare: number;         // 장기요양
    employmentInsurance: number;  // 고용보험
    incomeTax: number;            // 소득세
    localTax: number;             // 지방소득세
    otherDeduction: number;       // 기타
  };

  totalPayments: number;
  totalDeductions: number;
  netPay: number;                 // 실수령액

  // 근태
  attendance: {
    workDays: number;
    totalHours: number;
    overtimeHours: number;
  };
}
