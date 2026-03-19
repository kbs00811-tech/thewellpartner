/**
 * Zod 스키마 정의
 * 공개 페이지 폼 검증용
 */
import { z } from "zod";

// ──── 공통 필드 ────
const phoneSchema = z.string()
  .min(1, "연락처를 입력해주세요")
  .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, "올바른 연락처 형식이 아닙니다 (예: 010-1234-5678)");

const emailSchema = z.string()
  .email("올바른 이메일 형식이 아닙니다")
  .or(z.literal(""));

const nameSchema = z.string()
  .min(1, "이름을 입력해주세요")
  .max(50, "이름은 50자 이내로 입력해주세요");

// ──── 기업 문의 폼 ────
export const companyInquirySchema = z.object({
  companyName: z.string().min(1, "회사명을 입력해주세요").max(100),
  managerName: nameSchema,
  phone: phoneSchema,
  email: z.string().min(1, "이메일을 입력해주세요").email("올바른 이메일 형식이 아닙니다"),
  jobType: z.string().optional(),
  headcount: z.string().optional(),
  location: z.string().min(1, "근무지를 입력해주세요"),
  message: z.string().min(1, "문의 내용을 입력해주세요").max(2000, "문의 내용은 2000자 이내로 입력해주세요"),
});
export type CompanyInquiryForm = z.infer<typeof companyInquirySchema>;

// ──── 구직자 문의 폼 ────
export const seekerInquirySchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  location: z.string().min(1, "희망 근무지를 입력해주세요"),
  job: z.string().optional(),
  experience: z.string().optional(),
  message: z.string().max(2000).optional(),
});
export type SeekerInquiryForm = z.infer<typeof seekerInquirySchema>;

// ──── 채용 지원 폼 ────
export const jobApplicationSchema = z.object({
  name: nameSchema,
  mobile: phoneSchema,
  email: emailSchema.optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  experience: z.string().max(2000).optional(),
  message: z.string().max(2000).optional(),
});
export type JobApplicationForm = z.infer<typeof jobApplicationSchema>;

// ──── 사원 등록 폼 ────
export const employeeRegisterSchema = z.object({
  name: nameSchema,
  birthDate: z.string().min(1, "생년월일을 선택해주세요"),
  mobile: phoneSchema,
  email: emailSchema.optional(),
  nationality: z.string().optional(),
  department: z.string().optional(),
  site: z.string().optional(),
  message: z.string().max(1000).optional(),
});
export type EmployeeRegisterForm = z.infer<typeof employeeRegisterSchema>;

// ──── 사번 조회 폼 ────
export const employeeLookupSchema = z.object({
  name: nameSchema,
  mobile: phoneSchema,
  birthDate: z.string().optional(),
});
export type EmployeeLookupForm = z.infer<typeof employeeLookupSchema>;

// ──── 비밀번호 변경 ────
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
  newPassword: z.string()
    .min(8, "8자 이상이어야 합니다")
    .regex(/[A-Za-z]/, "영문자를 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다"),
  confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "새 비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "현재 비밀번호와 다른 비밀번호를 입력해주세요",
  path: ["newPassword"],
});

// ──── 유틸리티: Zod 에러를 필드별 메시지로 변환 ────
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}
