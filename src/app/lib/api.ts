/**
 * 더웰파트너 통합 API 클라이언트
 * Public + Admin + ERP
 * - 보안 강화: XSS sanitize, request timeout, 에러 표준화
 */
import { sanitizeInput, fetchWithTimeout, isTokenExpired } from "./security";

// ──── 환경 설정 (환경변수 우선, 폴백값 유지) ────
const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "ldgbxbutwxiixatlfpgq";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2J4YnV0d3hpaXhhdGxmcGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDE3NjgsImV4cCI6MjA4ODgxNzc2OH0.oRgpDESfx0_urvz5GKL1lSF4LVSQhjcNPH7L5XMjLOM";

const BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-c3ee322d`;

const TOKEN_KEY = "twp_admin_token";
const USER_KEY = "twp_admin_user";
const REQUEST_TIMEOUT = 30_000; // 30초

// ──── Auth Storage ────
export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function getUser(): any | null {
  try {
    const r = localStorage.getItem(USER_KEY);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}
export function setAuth(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function isLoggedIn(): boolean {
  const token = getToken();
  if (!token) return false;
  return !isTokenExpired(token);
}

// ──── 통합 에러 클래스 ────
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number = 0, code: string = "UNKNOWN") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// ──── Core Fetch ────
async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...(token ? { "X-Admin-Token": token } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      ...options,
      headers,
      timeout: REQUEST_TIMEOUT,
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new ApiError("요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.", 0, "TIMEOUT");
    }
    throw new ApiError("네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.", 0, "NETWORK");
  }

  if (res.status === 401) {
    clearAuth();
    throw new ApiError("인증이 만료되었습니다. 다시 로그인해주세요.", 401, "UNAUTHORIZED");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(
      err.message || err.error || `서버 오류가 발생했습니다 (${res.status})`,
      res.status,
      err.code || "SERVER_ERROR"
    );
  }

  const json = await res.json();
  if (json && typeof json === "object" && "success" in json) {
    if (json.success) return json.data;
    throw new ApiError(json.message || "요청 처리에 실패했습니다.", 0, "API_ERROR");
  }
  return json;
}

// ──── Doc Token Fetch ────
async function docFetch(path: string, docToken: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${docToken}`,
    ...(options.headers as Record<string, string> || {}),
  };

  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      ...options,
      headers,
      timeout: REQUEST_TIMEOUT,
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new ApiError("요청 시간이 초과되었습니다.", 0, "TIMEOUT");
    }
    throw new ApiError("네트워크 연결에 실패했습니다.", 0, "NETWORK");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(err.message || err.error || `HTTP ${res.status}`, res.status, "SERVER_ERROR");
  }

  const json = await res.json();
  if (json && typeof json === "object" && "success" in json) {
    if (json.success) return json.data;
    throw new ApiError(json.message || "요청 처리에 실패했습니다.", 0, "API_ERROR");
  }
  return json;
}

// ──── Sanitized Body Helper ────
function safeBody(data: any): string {
  return JSON.stringify(sanitizeInput(data));
}

// ──── Auth ────
export async function login(username: string, password: string) {
  const data = await apiFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify({ username: username.trim(), password }),
  });
  const user = data.user;
  const token = data.token;
  setAuth(token, user);
  return data;
}

export function logout() { clearAuth(); }

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch("/admin/change-password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ──── Seed ────
export async function seed() { return apiFetch("/seed?force=true"); }

// ──── Dashboard ────
export async function getDashboard() { return apiFetch("/admin/dashboard"); }

// ──── Generic CRUD Factory ────
function createCrud(path: string) {
  return {
    list: () => apiFetch(path),
    get: (id: string) => apiFetch(`${path}/${id}`),
    create: (data: any) => apiFetch(path, { method: "POST", body: safeBody(data) }),
    update: (id: string, data: any) => apiFetch(`${path}/${id}`, { method: "PUT", body: safeBody(data) }),
    remove: (id: string) => apiFetch(`${path}/${id}`, { method: "DELETE" }),
  };
}

// ──── Admin CRUD ────
export const jobPosts = createCrud("/admin/job-posts");
export const applicants = createCrud("/admin/applicants");
export const jobApplications = {
  ...createCrud("/admin/job-applications"),
  listEnriched: () => apiFetch("/admin/job-applications-enriched"),
};
export const inquiries = {
  ...createCrud("/admin/inquiries"),
  getMemos: (id: string) => apiFetch(`/admin/inquiries/${id}/memos`),
};
export const inquiryMemos = createCrud("/admin/inquiry-memos");
export const employees = createCrud("/admin/employees");
export const departments = createCrud("/admin/departments");
export const positions = createCrud("/admin/positions");
export const documentTemplates = createCrud("/admin/document-templates");
export const issuedDocuments = createCrud("/admin/issued-documents");
export const payrollDocuments = createCrud("/admin/payroll-documents");
export const materials = createCrud("/admin/materials");
export const noticesAdmin = createCrud("/admin/notices");
export const faqsAdmin = createCrud("/admin/faqs");
export const banners = createCrud("/admin/banners");
export const adminUsers = createCrud("/admin/users");

// ──── Public API ────
export const publicApi = {
  getBanners: () => apiFetch("/public/banners"),
  getFaqs: (category?: string) => apiFetch(`/public/faqs${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  getNotices: () => apiFetch("/public/notices"),
  getNotice: (id: string) => apiFetch(`/public/notices/${encodeURIComponent(id)}`),
  getCompanyInfo: () => apiFetch("/public/company-info"),
  getSiteContent: (section: string) => apiFetch(`/public/site-content/${encodeURIComponent(section)}`),
  getMaterials: () => apiFetch("/public/materials"),
};

// ──── Public Jobs API ────
export const publicJobs = {
  list: (params?: { keyword?: string; location?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.keyword) q.set("keyword", params.keyword);
    if (params?.location) q.set("location", params.location);
    if (params?.category) q.set("category", params.category);
    const qs = q.toString();
    return apiFetch(`/jobs${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => apiFetch(`/jobs/${encodeURIComponent(id)}`),
  getFilters: () => apiFetch("/jobs/meta/filters"),
  apply: (jobId: string, data: any) => apiFetch(`/jobs/${encodeURIComponent(jobId)}/apply`, { method: "POST", body: safeBody(data) }),
};

// ──── Public Inquiry API ────
export const publicInquiry = {
  submit: (data: any) => apiFetch("/inquiries", { method: "POST", body: safeBody(data) }),
  getTypes: () => apiFetch("/inquiries/types"),
};

// ──── Public Document Issuance API ────
export const publicDocs = {
  directVerify: (data: any) => apiFetch("/docs/auth/direct-verify", { method: "POST", body: safeBody(data) }),
  sendCode: (data: any) => apiFetch("/docs/auth/send-code", { method: "POST", body: safeBody(data) }),
  verifyCode: (data: any) => apiFetch("/docs/auth/verify-code", { method: "POST", body: safeBody(data) }),
  getAvailable: (token: string) => docFetch("/docs/available", token),
  getPayroll: (token: string) => docFetch("/docs/payroll", token),
  issueDoc: (token: string, data: any) => docFetch("/docs/issue", token, { method: "POST", body: safeBody(data) }),
};

// ──── Public Employee Self-Registration API ────
export const publicEmployee = {
  register: (data: any) => apiFetch("/public/employee-register", { method: "POST", body: safeBody(data) }),
  lookup: (data: any) => apiFetch("/public/employee-lookup", { method: "POST", body: safeBody(data) }),
};

// ──── ERP API ────
export const erpApi = {
  clientCompanies: createCrud("/erp/client-companies"),
  workSites: createCrud("/erp/work-sites"),
  placements: {
    ...createCrud("/erp/placements"),
    end: (id: string) => apiFetch(`/erp/placements/${encodeURIComponent(id)}/end`, { method: "PUT" }),
  },
  attendance: createCrud("/erp/attendance"),
  getDashboard: () => apiFetch("/erp/dashboard"),
  visas: createCrud("/erp/visas"),
  stayRecords: createCrud("/erp/stay-records"),
  getForeignDashboard: () => apiFetch("/erp/foreign-dashboard"),
};

// ──── 정산 API (파트너사별 청구/마진 정산) ────
export const settlementApi = {
  // 단가 마스터 (파트너사 × 직무)
  billingRates: createCrud("/erp/billing-rates"),
  // 고객사 청구서 (월별)
  partnerBillings: {
    ...createCrud("/erp/partner-billings"),
    generate: (data: { clientCompanyId: string; yearMonth: string }) =>
      apiFetch("/erp/partner-billings/generate", { method: "POST", body: safeBody(data) }),
    issue: (id: string) => apiFetch(`/erp/partner-billings/${encodeURIComponent(id)}/issue`, { method: "PUT" }),
    markPaid: (id: string) => apiFetch(`/erp/partner-billings/${encodeURIComponent(id)}/paid`, { method: "PUT" }),
  },
  // 마진 정산 (회사 수익)
  settlements: {
    ...createCrud("/erp/settlements"),
    summary: (yearMonth: string) =>
      apiFetch(`/erp/settlements/summary?yearMonth=${encodeURIComponent(yearMonth)}`),
    byPartner: (clientCompanyId: string) =>
      apiFetch(`/erp/settlements/by-partner?clientCompanyId=${encodeURIComponent(clientCompanyId)}`),
  },
};

// ──── Statistics API ────
export const statistics = {
  recruit: () => apiFetch("/admin/statistics/recruit"),
  inquiries: () => apiFetch("/admin/statistics/inquiries"),
  documents: () => apiFetch("/admin/statistics/documents"),
  erp: () => apiFetch("/admin/statistics/erp"),
  foreign: () => apiFetch("/admin/statistics/foreign"),
};

// ──── Storage / File Upload API ────
export const storage = {
  upload: async (file: File, category: string) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    let res: Response;
    try {
      res = await fetchWithTimeout(`${BASE_URL}/storage/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          ...(token ? { "X-Admin-Token": token } : {}),
        },
        body: formData,
        timeout: 60_000, // 파일 업로드는 60초
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new ApiError("파일 업로드 시간이 초과되었습니다.", 0, "TIMEOUT");
      }
      throw new ApiError("네트워크 연결에 실패했습니다.", 0, "NETWORK");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(err.message || err.error || `업로드 실패 (${res.status})`, res.status, "UPLOAD_ERROR");
    }
    const json = await res.json();
    if (json && typeof json === "object" && "success" in json) {
      if (json.success) return json.data;
      throw new ApiError(json.message || "업로드 실패", 0, "UPLOAD_ERROR");
    }
    return json;
  },
  listFiles: (category?: string) => apiFetch(`/storage/files${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  getSignedUrl: (id: string) => apiFetch(`/storage/signed-url/${encodeURIComponent(id)}`),
  deleteFile: (id: string) => apiFetch(`/storage/files/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ──── Admin Roles CRUD ────
export const adminRoles = createCrud("/admin/roles");

// ──── Audit Logs ────
export const auditLogs = {
  ...createCrud("/admin/audit-logs"),
  log: (action: string, details?: string) => {
    const user = getUser();
    return apiFetch("/admin/audit-logs", {
      method: "POST",
      body: JSON.stringify({
        admin_id: user?.id || "unknown",
        admin_name: user?.name || "알 수 없음",
        action,
        details: details || "",
        ip: "browser",
        status: "SUCCESS",
        created_at: new Date().toISOString(),
      }),
    });
  },
};

// ──── System Settings ────
export const systemSettings = {
  get: () => apiFetch("/admin/settings"),
  save: (data: any) => apiFetch("/admin/settings", { method: "PUT", body: safeBody(data) }),
};

// ──── Badge Counts ────
export const getBadgeCounts = () => apiFetch("/admin/badge-counts");

// ──── Payroll (급여명세서) ────
export const payroll = {
  ...createCrud("/erp/payroll"),
  batchCreate: (data: { payYearMonth: string; employeeIds?: string[] }) =>
    apiFetch("/erp/payroll/batch-create", { method: "POST", body: JSON.stringify(data) }),
  confirm: (id: string) =>
    apiFetch(`/erp/payroll/${encodeURIComponent(id)}/confirm`, { method: "PUT" }),
  batchConfirm: (ids: string[]) =>
    apiFetch("/erp/payroll/batch-confirm", { method: "POST", body: JSON.stringify({ ids }) }),
  sendKakao: (id: string) =>
    apiFetch(`/erp/payroll/${encodeURIComponent(id)}/send-kakao`, { method: "POST" }),
  batchSendKakao: (ids: string[]) =>
    apiFetch("/erp/payroll/batch-send-kakao", { method: "POST", body: JSON.stringify({ ids }) }),
  getSummary: (payYearMonth?: string) =>
    apiFetch(`/erp/payroll/summary${payYearMonth ? `?payYearMonth=${encodeURIComponent(payYearMonth)}` : ""}`),
  getKakaoEmployees: () => apiFetch("/erp/payroll/kakao-employees"),
  updateKakaoId: (employeeId: string, kakaoId: string) =>
    apiFetch(`/admin/employees/${encodeURIComponent(employeeId)}/kakao`, { method: "PUT", body: JSON.stringify({ kakao_id: kakaoId }) }),
};

// ──── 이메일 발송 API ────
export const emailApi = {
  send: (data: { to: string | string[]; subject: string; html: string; attachments?: any[]; replyTo?: string; type?: string; refId?: string }) =>
    apiFetch("/email/send", { method: "POST", body: JSON.stringify(data) }),
  sendInvoice: (data: { billingId: string; recipientEmail: string; pdfBase64?: string; fileName?: string; message?: string }) =>
    apiFetch("/email/send-invoice", { method: "POST", body: JSON.stringify(data) }),
  sendPayslip: (data: { employeeId: string; yearMonth: string; pdfBase64?: string; fileName?: string; message?: string }) =>
    apiFetch("/email/send-payslip", { method: "POST", body: JSON.stringify(data) }),
  batchSendPayslips: (data: { yearMonth: string; employees: any[] }) =>
    apiFetch("/email/batch-send-payslips", { method: "POST", body: JSON.stringify(data) }),
  logs: createCrud("/admin/email-logs"),
};

// ──── Site Content ────
export const siteContent = {
  get: (section: string) => apiFetch(`/admin/site-content/${encodeURIComponent(section)}`),
  save: (section: string, data: any) => apiFetch(`/admin/site-content/${encodeURIComponent(section)}`, { method: "PUT", body: safeBody(data) }),
};
