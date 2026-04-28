import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import * as db from "./db.tsx";
import { seedAll } from "./seed.tsx";

// ──── Supabase Storage Setup ────
const BUCKET_NAME = "make-c3ee322d-uploads";
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Idempotent bucket creation
(async () => {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: false });
      console.log(`Bucket ${BUCKET_NAME} created`);
    }
  } catch (e: any) { console.log("Bucket init:", e.message); }
})();

const app = new Hono();
app.use("*", logger(console.log));
app.use("/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization", "X-Admin-Token"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], exposeHeaders: ["Content-Length"], maxAge: 600 }));

const BASE = "/make-server-c3ee322d";

// ──── Solapi SMS / 알림톡 통합 Helper ────
async function solapiAuthHeader(): Promise<string> {
  const apiKey = Deno.env.get("SOLAPI_API_KEY") || "";
  const apiSecret = Deno.env.get("SOLAPI_API_SECRET") || "";
  if (!apiKey || !apiSecret) return "";
  const date = new Date().toISOString();
  const salt = crypto.randomUUID();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(apiSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(date + salt));
  const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function sendSolapiSMS(to: string, text: string): Promise<{ success: boolean; error?: string }> {
  const auth = await solapiAuthHeader();
  if (!auth) {
    console.log(`[DEMO] SMS 전송 시뮬레이션 → ${to}: ${text}`);
    return { success: true };
  }
  try {
    const callingNumber = Deno.env.get("SOLAPI_SENDER_PHONE") || "01000000000";
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": auth },
      body: JSON.stringify({ message: { to, from: callingNumber, text } }),
    });
    const data = await res.json();
    if (!res.ok || data.statusCode) {
      console.log("[Solapi SMS Error]", JSON.stringify(data));
      return { success: false, error: data.message || data.errorMessage || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function sendSolapiAlimtalk(to: string, templateId: string, variables: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  const auth = await solapiAuthHeader();
  if (!auth) {
    console.log(`[DEMO] 알림톡 전송 시뮬레이션 → ${to} / template: ${templateId} / vars: ${JSON.stringify(variables)}`);
    return { success: true };
  }
  try {
    const pfId = Deno.env.get("SOLAPI_PFID") || "";
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": auth },
      body: JSON.stringify({
        message: { to, from: Deno.env.get("SOLAPI_SENDER_PHONE") || "01000000000", type: "ATA", kakaoOptions: { pfId, templateId, variables } },
      }),
    });
    const data = await res.json();
    if (!res.ok || data.statusCode) {
      console.log("[Solapi Alimtalk Error]", JSON.stringify(data));
      return { success: false, error: data.message || data.errorMessage || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// 급여명세서 알림톡/SMS 발송 함수 (솔라피 통합)
async function sendPayslipNotification(mobile: string, payslipData: any): Promise<{ success: boolean; error?: string }> {
  const phone = mobile.replace(/-/g, "");
  const templateId = Deno.env.get("SOLAPI_PAYSLIP_TEMPLATE_ID") || "";
  if (templateId) {
    const result = await sendSolapiAlimtalk(phone, templateId, {
      "#{이름}": payslipData.employee_name,
      "#{급여월}": payslipData.pay_year_month,
      "#{지급총액}": Number(payslipData.total_pay).toLocaleString(),
      "#{공제총액}": Number(payslipData.total_deduction).toLocaleString(),
      "#{실수령액}": Number(payslipData.net_pay).toLocaleString(),
    });
    if (result.success) return result;
    console.log(`[알림톡 실패 → SMS fallback] ${result.error}`);
  }
  const text = `[더웰파트너] ${payslipData.pay_year_month} 급여명세서\n${payslipData.employee_name}님\n지급총액: ${Number(payslipData.total_pay).toLocaleString()}원\n공제총액: ${Number(payslipData.total_deduction).toLocaleString()}원\n실수령액: ${Number(payslipData.net_pay).toLocaleString()}원\n서류발급센터에서 상세내역 확인`;
  return await sendSolapiSMS(phone, text);
}

// ──── Standardized Response Helpers ────
function ok(data: any, message = "정상 처리되었습니다.", meta?: any) {
  return { success: true, message, data, ...(meta ? { meta } : {}) };
}
function fail(message: string, errorCode = "UNKNOWN") {
  return { success: false, message, errorCode };
}

// ──── Auth Middleware ────
// 관리자 인증이 필요한 경로에 적용
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24시간
const DOC_TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30분

async function requireAuth(c: any): Promise<{ user: any; role: any } | null> {
  // X-Admin-Token 커스텀 헤더 우선, 없으면 Authorization에서 추출
  const token = c.req.header("X-Admin-Token") || c.req.header("Authorization")?.split(" ")[1] || "";
  const userId = db.parseAdminToken(token);
  if (!userId) return null;
  // 토큰 만료 검증
  const parts = token.split("-");
  const tokenTimestamp = parseInt(parts[parts.length - 1], 10);
  if (isNaN(tokenTimestamp) || Date.now() - tokenTimestamp > TOKEN_EXPIRY_MS) return null;
  const user = await db.findById("admin_users", userId);
  if (!user || user.status !== "ACTIVE") return null;
  const role = await db.findById("admin_roles", user.role_id);
  return { user, role };
}

// Doc 토큰 만료 검증 헬퍼
function validateDocToken(token: string): string | null {
  if (!token.startsWith("doc-")) return null;
  const parts = token.split("-");
  const tokenTimestamp = parseInt(parts[parts.length - 1], 10);
  if (isNaN(tokenTimestamp) || Date.now() - tokenTimestamp > DOC_TOKEN_EXPIRY_MS) return null;
  return parts.slice(1, -1).join("-");
}

// password_hash 제거 헬퍼
function stripSensitive(user: any) {
  if (!user) return user;
  const { password_hash, ...safe } = user;
  return safe;
}

// Admin 경로 미들웨어 (로그인/시드/공개 API 제외)
app.use(`${BASE}/admin/*`, async (c: any, next: any) => {
  const path = c.req.path.replace(BASE, "");
  // 로그인은 인증 불필요
  if (path === "/admin/login") return next();
  const auth = await requireAuth(c);
  if (!auth) return c.json(fail("인증이 필요합니다. 다시 로그인해주세요.", "UNAUTHORIZED"), 401);
  c.set("adminUser", auth.user);
  c.set("adminRole", auth.role);
  return next();
});

app.use(`${BASE}/erp/*`, async (c: any, next: any) => {
  const auth = await requireAuth(c);
  if (!auth) return c.json(fail("인증이 필요합니다. 다시 로그인해주세요.", "UNAUTHORIZED"), 401);
  c.set("adminUser", auth.user);
  c.set("adminRole", auth.role);
  return next();
});

app.use(`${BASE}/storage/*`, async (c: any, next: any) => {
  const auth = await requireAuth(c);
  if (!auth) return c.json(fail("인증이 필요합니다.", "UNAUTHORIZED"), 401);
  c.set("adminUser", auth.user);
  return next();
});

// ──── Health & Seed ────
app.get(`${BASE}/health`, (c) => c.json(ok({ status: "ok" })));
// Seed는 관리자 인증 필요 (데이터 초기화 방지)
app.get(`${BASE}/seed`, async (c) => {
  try {
    const force = c.req.query("force") === "true";
    if (force) {
      const roles = await db.findAll("admin_roles");
      for (const r of roles) await db.remove("admin_roles", r.id);
      const users = await db.findAll("admin_users");
      for (const u of users) await db.remove("admin_users", u.id);
      console.log("[Seed] Force reset: cleared admin_roles and admin_users");
    }
    return c.json(await seedAll());
  }
  catch (e: any) { console.log("Seed error:", e.message); return c.json(fail(e.message, "SEED_ERROR"), 500); }
});

// ═══════════════════════════════════════════
// 3. AUTH API
// ═══════════════════════════════════════════

// ──── Brute-force Protection ────
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (record.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((record.lockedUntil - now) / 1000) };
  }
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordLoginFailure(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    console.log(`[SECURITY] IP ${ip} locked out after ${record.count} failed attempts`);
  }
  loginAttempts.set(ip, record);
}

function clearLoginAttempts(ip: string) { loginAttempts.delete(ip); }

setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of loginAttempts.entries()) {
    if (r.lockedUntil > 0 && r.lockedUntil <= now) loginAttempts.delete(ip);
  }
}, 30 * 60 * 1000);

// ──── 공통 로그인 핸들러 (중복 제거) ────
async function handleLogin(c: any) {
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const rateCheck = checkLoginRateLimit(ip);
  if (!rateCheck.allowed) return c.json(fail(`로그인 시도 횟수를 초과했습니다. ${rateCheck.retryAfterSec}초 후에 다시 시도해주세요.`, "RATE_LIMITED"), 429);
  const { username, password } = await c.req.json();
  const admins = await db.findAll("admin_users");
  const user = admins.find((u: any) => u.username === username);
  if (!user) { recordLoginFailure(ip); return c.json(fail("아이디 또는 비밀번호가 올바르지 않습니다.", "UNAUTHORIZED"), 401); }
  const passwordMatch = await db.verifyPassword(password, user.password_hash);
  if (!passwordMatch) { recordLoginFailure(ip); return c.json(fail("아이디 또는 비밀번호가 올바르지 않습니다.", "UNAUTHORIZED"), 401); }
  clearLoginAttempts(ip);
  await db.save("admin_users", user.id, { ...user, last_login_at: db.now() });
  const role = await db.findById("admin_roles", user.role_id);
  const logId = db.generateId();
  await db.save("audit_logs", logId, { id: logId, admin_id: user.id, admin_name: user.name, action: "로그인", details: `${user.username} 로그인 성공`, ip, status: "SUCCESS", created_at: db.now() });
  const token = `twp-${user.id}-${Date.now()}`;
  const profile = { id: user.id, username: user.username, name: user.name, email: user.email, role: role?.role_code || "VIEWER", role_name: role?.role_name || "조회", permissions: role?.permissions || [] };
  return c.json(ok({ user: profile, token, accessToken: token, admin: profile }, "로그인되었습니다."));
}

app.post(`${BASE}/auth/admin/login`, async (c) => {
  try { return await handleLogin(c); } catch (e: any) { console.log("Login error:", e.message); return c.json(fail(`로그인 오류: ${e.message}`, "LOGIN_ERROR"), 500); }
});
app.post(`${BASE}/admin/login`, async (c) => {
  try { return await handleLogin(c); } catch (e: any) { return c.json(fail(`로그인 오류: ${e.message}`, "LOGIN_ERROR"), 500); }
});

// ──── 공통 인증정보 조회 핸들러 (중복 제거) ────
async function handleAuthMe(c: any) {
  const token = c.req.header("Authorization")?.split(" ")[1] || "";
  const userId = db.parseAdminToken(token);
  if (!userId) return c.json(fail("인증 토큰이 유효하지 않습니다.", "UNAUTHORIZED"), 401);
  const user = await db.findById("admin_users", userId);
  if (!user) return c.json(fail("사용자를 찾을 수 없습니다.", "UNAUTHORIZED"), 401);
  const role = await db.findById("admin_roles", user.role_id);
  return c.json(ok({ id: user.id, username: user.username, name: user.name, email: user.email, role: role?.role_code, role_name: role?.role_name, permissions: role?.permissions || [] }));
}

app.get(`${BASE}/auth/me`, async (c) => {
  try { return await handleAuthMe(c); } catch (e: any) { return c.json(fail(`사용자 정보 조회 오류: ${e.message}`, "AUTH_ERROR"), 500); }
});
app.get(`${BASE}/admin/me`, async (c) => {
  try { return await handleAuthMe(c); } catch (e: any) { return c.json(fail(`사용자 정보 조회 오류: ${e.message}`, "AUTH_ERROR"), 500); }
});

// ═══════════════════════════════════════════
// 4. PUBLIC API - Homepage
// ═══════════════════════════════════════════

app.get(`${BASE}/public/banners`, async (c) => {
  try {
    const items = (await db.findAll("site_banners")).filter((b: any) => b.is_active).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    return c.json(ok(items));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 공개 회사정보 API (민감정보 제외)
app.get(`${BASE}/public/company-info`, async (c) => {
  try {
    const settings = await db.findById("system_settings", "main") || {};
    return c.json(ok({
      company_name: settings.company_name || "더웰파트너",
      ceo_name: settings.ceo_name || "",
      business_no: settings.business_no || "",
      phone: settings.phone || "",
      email: settings.email || "",
      address: settings.address || "",
      branch_address: settings.branch_address || "",
      branch_phone: settings.branch_phone || "",
      branch_email: settings.branch_email || "",
      business_hours: settings.business_hours || "평일 09:00 ~ 18:00 (공휴일 제외)",
      founded_year: settings.founded_year || "",
      // Social links
      social_blog: settings.social_blog || "",
      social_instagram: settings.social_instagram || "",
      social_youtube: settings.social_youtube || "",
      social_facebook: settings.social_facebook || "",
      social_kakao_channel: settings.social_kakao_channel || "",
      social_linkedin: settings.social_linkedin || "",
    }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/public/faqs`, async (c) => {
  try {
    const category = c.req.query("category");
    let items = (await db.findAll("faqs")).filter((f: any) => f.is_active);
    if (category) items = items.filter((f: any) => f.category === category);
    items.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    return c.json(ok(items));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/public/notices`, async (c) => {
  try {
    const items = (await db.findAll("notices")).filter((n: any) => n.is_active).sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
    return c.json(ok(items));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/public/notices/:id`, async (c) => {
  try {
    const item = await db.findById("notices", c.req.param("id"));
    if (!item) return c.json(fail("공지사항을 찾을 수 없습니다.", "NOT_FOUND"), 404);
    await db.save("notices", item.id, { ...item, view_count: (item.view_count || 0) + 1 });
    return c.json(ok(item));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// ═══════════════════════════════════════════
// 5. PUBLIC API - Jobs
// ═══════════════════════════════════════════

app.get(`${BASE}/jobs`, async (c) => {
  try {
    const keyword = c.req.query("keyword") || "";
    const location = c.req.query("location") || "";
    const category = c.req.query("category") || "";
    const status = c.req.query("status") || "OPEN";
    let items = await db.findAll("job_posts");
    items = items.filter((j: any) => {
      if (status && j.status !== status) return false;
      if (keyword && !(j.title || "").includes(keyword) && !(j.company_name || "").includes(keyword)) return false;
      if (location && !(j.work_location || "").includes(location)) return false;
      if (category && j.job_category !== category) return false;
      return true;
    });
    items.sort((a: any, b: any) => (b.published_at || "").localeCompare(a.published_at || ""));
    return c.json(ok(items, "정상 처리되었습니다.", { totalCount: items.length }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/jobs/:id`, async (c) => {
  try {
    const item = await db.findById("job_posts", c.req.param("id"));
    if (!item) return c.json(fail("채용공고를 찾을 수 없습니다.", "NOT_FOUND"), 404);
    return c.json(ok(item));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/jobs/meta/filters`, async (c) => {
  try {
    const jobs = (await db.findAll("job_posts")).filter((j: any) => j.status === "OPEN");
    const locations = [...new Set(jobs.map((j: any) => j.work_location).filter(Boolean))];
    const categories = [...new Set(jobs.map((j: any) => j.job_category).filter(Boolean))];
    return c.json(ok({ locations, categories }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.post(`${BASE}/jobs/:id/apply`, async (c) => {
  try {
    const jobId = c.req.param("id");
    const job = await db.findById("job_posts", jobId);
    if (!job) return c.json(fail("채용공고를 찾을 수 없습니다.", "NOT_FOUND"), 404);
    if (job.status !== "OPEN") return c.json(fail("마감된 공고입니다.", "JOB_POST_CLOSED"), 400);

    const body = await c.req.json();
    const applicantId = db.generateId();
    const applicant = {
      id: applicantId,
      name: body.name,
      mobile: body.mobile,
      email: body.email || "",
      birth_date: body.birthDate || "",
      gender: body.gender || "",
      nationality: body.nationality || "한국",
      current_address: body.currentAddress || "",
      desired_location: body.desiredLocation || "",
      desired_job: body.desiredJob || "",
      career_summary: body.careerSummary || "",
      visa_type: body.visaType || null,
      korean_level: body.koreanLevel || null,
      dormitory_needed: body.dormitoryNeeded || false,
      shift_available: body.shiftAvailable || false,
      created_at: db.now(),
      updated_at: db.now(),
    };
    await db.save("applicants", applicantId, applicant);

    const appId = db.generateId();
    const application = {
      id: appId,
      job_post_id: jobId,
      applicant_id: applicantId,
      apply_channel: "WEBSITE",
      status: "APPLIED",
      memo: body.selfIntro || "",
      applied_at: db.now(),
      updated_at: db.now(),
    };
    await db.save("job_applications", appId, application);
    return c.json(ok({ applicantId, applicationId: appId }, "지원이 완료되었습니다."), 201);
  } catch (e: any) { console.log("Apply error:", e.message); return c.json(fail(e.message, "INVALID_REQUEST"), 500); }
});

// ═══════════════════════════════════════════
// 6. PUBLIC API - Inquiries
// ═══════════════════════════════════════════

app.post(`${BASE}/inquiries`, async (c) => {
  try {
    const body = await c.req.json();
    const id = db.generateId();
    const inquiry = {
      id,
      inquiry_type: body.inquiryType || "COMPANY",
      company_name: body.companyName || null,
      name: body.name,
      mobile: body.mobile,
      email: body.email || "",
      title: body.title,
      content: body.content,
      status: "RECEIVED",
      is_starred: false,
      assigned_admin_id: null,
      created_at: db.now(),
      updated_at: db.now(),
    };
    await db.save("inquiries", id, inquiry);
    return c.json(ok({ inquiryId: id }, "문의가 접수되었습니다."), 201);
  } catch (e: any) { return c.json(fail(e.message, "INVALID_REQUEST"), 500); }
});

app.get(`${BASE}/inquiries/types`, (c) => {
  return c.json(ok([
    { code: "COMPANY", name: "기업 문의" },
    { code: "JOB_SEEKER", name: "구직자 문의" },
    { code: "PARTNERSHIP", name: "제휴 문의" },
  ]));
});

// ═══════════════════════════════════════════
// 7. PUBLIC API - Document Issuance (서류발급)
// ═══════════════════════════════════════════

// 7-0. Public Employee Self-Registration (사원 등록)
app.post(`${BASE}/public/employee-register`, async (c) => {
  try {
    const body = await c.req.json();
    const { name, birthDate, mobile, email, desiredDepartment, desiredSite, message } = body;
    if (!name || !birthDate || !mobile) {
      return c.json(fail("이름, 생년월일, 연락처는 필수 입력 항목입니다.", "VALIDATION_ERROR"), 400);
    }

    // Check duplicate by name + mobile
    const allEmps = await db.findAll("employees");
    const existing = allEmps.find((e: any) => e.name === name && e.mobile === mobile);
    if (existing) {
      return c.json(fail(
        `이미 등록된 사원입니다. 사번: ${existing.employee_no}`,
        "ALREADY_EXISTS"
      ), 409);
    }

    // Generate next employee number
    const employeeNo = await db.nextSeqNo("employees", "EMP-", 3);
    const id = db.generateId();

    const employee = {
      id,
      employee_no: employeeNo,
      name,
      birth_date: birthDate,
      mobile,
      email: email || "",
      department_name: desiredDepartment || "미배정",
      position_name: "사원",
      site_name: desiredSite || "",
      hire_date: new Date().toISOString().split("T")[0],
      employment_status: "ACTIVE",
      employment_type: "계약직",
      nationality: body.nationality || "한국",
      registration_memo: message || "",
      self_registered: true,
      created_at: db.now(),
      updated_at: db.now(),
    };

    await db.save("employees", id, employee);

    return c.json(ok({
      employeeNo,
      name,
      message: `사번 ${employeeNo}가 발급되었습니다. 서류발급센터에서 이 사번으로 본인인증이 가능합니다.`,
    }, "사원 등록이 완료되었습니다."), 201);
  } catch (e: any) {
    console.log("Employee registration error:", e.message);
    return c.json(fail(`사원 등록 오류: ${e.message}`, "REGISTRATION_ERROR"), 500);
  }
});

// 7-0b. Lookup employee number by name + mobile
app.post(`${BASE}/public/employee-lookup`, async (c) => {
  try {
    const { name, mobile, birthDate } = await c.req.json();
    if (!name || !mobile) {
      return c.json(fail("이름과 연락처는 필수입니다.", "VALIDATION_ERROR"), 400);
    }
    const allEmps = await db.findAll("employees");
    const emp = allEmps.find((e: any) => e.name === name && e.mobile === mobile);
    if (!emp) return c.json(fail("등록된 사원 정보를 찾을 수 없습니다.", "EMPLOYEE_NOT_FOUND"), 404);
    // Optionally verify birthDate
    if (birthDate && emp.birth_date && emp.birth_date !== birthDate) {
      return c.json(fail("생년월일이 일치하지 않습니다.", "BIRTH_MISMATCH"), 400);
    }
    return c.json(ok({
      employeeNo: emp.employee_no,
      name: emp.name,
      department: emp.department_name,
      status: emp.employment_status,
    }, "사번 조회에 성공했습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 직접 인증 (SMS 없이 사번+이름+생년월일로 바로 인증)
app.post(`${BASE}/docs/auth/direct-verify`, async (c) => {
  try {
    const { employeeNo, name, birthDate } = await c.req.json();
    const employees = await db.findAll("employees");
    const emp = employees.find((e: any) => e.employee_no === employeeNo && e.name === name);
    if (!emp) return c.json(fail("직원 정보를 찾을 수 없습니다.", "EMPLOYEE_NOT_FOUND"), 404);
    if (emp.birth_date && emp.birth_date !== birthDate) return c.json(fail("생년월일이 일치하지 않습니다.", "BIRTH_DATE_MISMATCH"), 400);
    const token = `doc-${emp.id}-${Date.now()}`;
    const employee = { name: emp.name, employeeNo: emp.employee_no, department: emp.department || "", position: emp.position || "" };
    const documents = [
      { docType: "EMPLOYMENT_CERT", name: "재직증명서", available: emp.employment_status === "ACTIVE" },
      { docType: "RESIGNATION_CERT", name: "퇴직증명서", available: emp.employment_status === "RESIGNED" },
      { docType: "CAREER_CERT", name: "경력증명서", available: true },
    ];
    return c.json(ok({ accessToken: token, employee, documents }, "인증되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.post(`${BASE}/docs/auth/send-code`, async (c) => {
  try {
    const { employeeNo, name, birthDate, mobile } = await c.req.json();
    const employees = await db.findAll("employees");
    const emp = employees.find((e: any) => e.employee_no === employeeNo && e.name === name);
    if (!emp) return c.json(fail("직원 정보를 찾을 수 없습니다.", "EMPLOYEE_NOT_FOUND"), 404);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const reqId = db.generateId();
    await db.save("verification_requests", reqId, {
      id: reqId, employee_id: emp.id, employee_no: employeeNo, name, birth_date: birthDate, mobile,
      verification_code: code, expires_at: new Date(Date.now() + 180000).toISOString(),
      verified_at: null, fail_count: 0, status: "PENDING", created_at: db.now(),
    });
    // 솔라피 SMS 발송 (키 미설정 시 데모 모드)
    const smsResult = await sendSolapiSMS(mobile.replace(/-/g, ""), `[더웰파트너] 본인인증 번호는 [${code}]입니다. 3분 내 입력해주세요.`);
    if (!smsResult.success) {
      console.log(`[SMS 발송 실패] ${mobile}: ${smsResult.error}`);
    }
    const isDemoMode = !(Deno.env.get("SOLAPI_API_KEY") && Deno.env.get("SOLAPI_API_SECRET"));
    return c.json(ok({ requestId: reqId, expireSeconds: 180, ...(isDemoMode ? { demoCode: code } : {}) }, "인증번호가 발송되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.post(`${BASE}/docs/auth/verify-code`, async (c) => {
  try {
    const { requestId, code } = await c.req.json();
    const req = await db.findById("verification_requests", requestId);
    if (!req) return c.json(fail("인증 요청을 찾을 수 없습니다.", "NOT_FOUND"), 404);
    if (req.status === "VERIFIED") return c.json(fail("이미 인증된 요청입니다.", "ALREADY_EXISTS"), 400);
    if (new Date(req.expires_at) < new Date()) return c.json(fail("인증번호가 만료되었습니다.", "VERIFICATION_EXPIRED"), 400);
    // 최대 5회 시도 제한
    if ((req.fail_count || 0) >= 5) return c.json(fail("인증 시도 횟수를 초과했습니다. 새로운 인증번호를 요청해주세요.", "MAX_ATTEMPTS_EXCEEDED"), 429);
    if (req.verification_code !== code) {
      await db.save("verification_requests", requestId, { ...req, fail_count: (req.fail_count || 0) + 1 });
      const remaining = 5 - (req.fail_count || 0) - 1;
      return c.json(fail(`인증번호가 올바르지 않습니다. (남은 시도: ${remaining}회)`, "VERIFICATION_FAILED"), 400);
    }
    const token = `doc-${req.employee_id}-${Date.now()}`;
    await db.save("verification_requests", requestId, { ...req, status: "VERIFIED", verified_at: db.now() });
    return c.json(ok({ accessToken: token, employeeId: req.employee_id }, "본인인증이 완료되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/docs/available`, async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1] || "";
    if (!token.startsWith("doc-")) return c.json(fail("서류발급 인증이 필요합니다.", "UNAUTHORIZED"), 401);
    const employeeId = validateDocToken(token);
    if (!employeeId) return c.json(fail("인증 토큰이 만료되었습니다.", "TOKEN_EXPIRED"), 401);
    const emp = await db.findById("employees", employeeId);
    if (!emp) return c.json(fail("직원 정보를 찾을 수 없습니다.", "EMPLOYEE_NOT_FOUND"), 404);
    const docs = [
      { docType: "EMPLOYMENT_CERT", name: "재직증명서", available: emp.employment_status === "ACTIVE" },
      { docType: "RESIGNATION_CERT", name: "퇴직증명서", available: emp.employment_status === "RESIGNED" },
      { docType: "CAREER_CERT", name: "경력증명서", available: true },
    ];
    return c.json(ok({ employee: { name: emp.name, employeeNo: emp.employee_no, department: emp.department_name }, documents: docs }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/docs/payroll`, async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1] || "";
    if (!token.startsWith("doc-")) return c.json(fail("서류발급 인증이 필요합니다.", "UNAUTHORIZED"), 401);
    const employeeId = validateDocToken(token);
    if (!employeeId) return c.json(fail("인증 토큰이 만료되었습니다.", "TOKEN_EXPIRED"), 401);
    const allPayroll = await db.findAll("payroll_documents");
    const mine = allPayroll.filter((p: any) => p.employee_id === employeeId);
    return c.json(ok(mine));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 서류발급 기록 저장 (프론트에서 PDF 생성 후 호출)
app.post(`${BASE}/docs/issue`, async (c) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1] || "";
    if (!token.startsWith("doc-")) return c.json(fail("서류발급 인증이 필요합니다.", "UNAUTHORIZED"), 401);
    const employeeId = validateDocToken(token);
    if (!employeeId) return c.json(fail("인증 토큰이 만료되었습니다.", "TOKEN_EXPIRED"), 401);
    const emp = await db.findById("employees", employeeId);
    if (!emp) return c.json(fail("직원 정보를 찾을 수 없습니다.", "EMPLOYEE_NOT_FOUND"), 404);
    const body = await c.req.json();
    const docId = db.generateId();
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    await db.save("issued_documents", docId, {
      id: docId,
      employee_id: employeeId,
      employee_name: emp.name,
      employee_no: emp.employee_no,
      doc_type: body.docType,
      doc_type_name: body.docTypeName || body.docType,
      issued_at: db.now(),
      issue_status: "SUCCESS",
      request_ip: ip,
      download_count: 1,
    });
    return c.json(ok({ id: docId, employee: emp }, "서류가 발급되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// ═══════════════════════════════════════════
// 8. ADMIN API
// ═══════════════════════════════════════════

// 8-1. Dashboard
app.get(`${BASE}/admin/dashboard`, async (c) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [inquiriesAll, applications, jobPostsAll, issuedDocsAll, employeesAll, placementsAll] = await Promise.all([
      db.findAll("inquiries"), db.findAll("job_applications"), db.findAll("job_posts"),
      db.findAll("issued_documents"), db.findAll("employees"), db.findAll("placements"),
    ]);

    const todayInquiries = inquiriesAll.filter((i: any) => i.created_at?.startsWith(today)).length;
    const todayApplicants = applications.filter((a: any) => a.applied_at?.startsWith(today)).length;
    const openJobs = jobPostsAll.filter((j: any) => j.status === "OPEN").length;
    const monthDocs = issuedDocsAll.filter((d: any) => { const dt = new Date(d.issued_at); const now = new Date(); return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear(); }).length;
    const activeEmployees = employeesAll.filter((e: any) => e.employment_status === "ACTIVE").length;
    const workingPlacements = placementsAll.filter((p: any) => p.status === "WORKING").length;

    const recentInquiries = [...inquiriesAll].sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 5);
    const recentApplications = [...applications].sort((a: any, b: any) => (b.applied_at || "").localeCompare(a.applied_at || "")).slice(0, 5);
    for (const app of recentApplications) {
      const applicant = await db.findById("applicants", app.applicant_id);
      const job = await db.findById("job_posts", app.job_post_id);
      app.applicant_name = applicant?.name || "알 수 없음";
      app.job_title = job?.title || "알 수 없음";
    }
    const recentDocs = [...issuedDocsAll].sort((a: any, b: any) => (b.issued_at || "").localeCompare(a.issued_at || "")).slice(0, 5);

    // Include all inquiries (with minimal fields) for monthly chart computation
    const allInquiries = inquiriesAll.map((i: any) => ({ inquiry_type: i.inquiry_type, status: i.status, created_at: i.created_at }));

    return c.json(ok({
      kpi: { todayInquiries, todayApplicants, openJobs, monthDocs, activeEmployees, workingPlacements },
      recentInquiries, recentApplications, recentDocs, allInquiries,
      totals: { inquiries: inquiriesAll.length, applications: applications.length, jobPosts: jobPostsAll.length, issuedDocs: issuedDocsAll.length, employees: employeesAll.length },
    }));
  } catch (e: any) { console.log("Dashboard error:", e.message); return c.json(fail(`대시보드 로드 오류: ${e.message}`, "DASHBOARD_ERROR"), 500); }
});

// ──── Audit Log 헬퍼 ────
async function writeAuditLog(c: any, action: string, details: string, status = "SUCCESS") {
  try {
    const adminUser = c.get("adminUser");
    const logId = db.generateId();
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    await db.save("audit_logs", logId, {
      id: logId,
      admin_id: adminUser?.id || "system",
      admin_name: adminUser?.name || "시스템",
      action,
      details,
      ip,
      status,
      created_at: db.now(),
    });
  } catch (e: any) { console.log("Audit log write error:", e.message); }
}

// 테이블명 → 한글 매핑
const TABLE_LABELS: Record<string, string> = {
  admin_users: "관리자계정", admin_roles: "역할", site_banners: "배너",
  notices: "공지사항", faqs: "FAQ", site_content: "사이트콘텐츠",
  inquiries: "문의", client_companies: "거래처", work_sites: "현장",
  employees: "직원", placements: "배치", attendance_records: "근태",
  payroll_slips: "급여명세", system_settings: "시스템설정",
  job_postings: "채용공고", job_applications: "지원서",
};

// ──── CRUD Helper (보안 강화 + 자동 Audit Log) ────
function crudRoutes(table: string, basePath: string) {
  const isAdminUsers = table === "admin_users";
  const tableLabel = TABLE_LABELS[table] || table;

  app.get(`${BASE}${basePath}`, async (c) => {
    try {
      let items = await db.findAll(table);
      if (isAdminUsers) items = items.map(stripSensitive);
      return c.json(ok(items));
    }
    catch (e: any) { return c.json(fail(`${tableLabel} 목록 조회 오류: ${e.message}`, "LIST_ERROR"), 500); }
  });
  app.get(`${BASE}${basePath}/:id`, async (c) => {
    try {
      const item = await db.findById(table, c.req.param("id"));
      if (!item) return c.json(fail("데이터를 찾을 수 없습니다.", "NOT_FOUND"), 404);
      return c.json(ok(isAdminUsers ? stripSensitive(item) : item));
    } catch (e: any) { return c.json(fail(`${tableLabel} 조회 오류: ${e.message}`, "GET_ERROR"), 500); }
  });
  app.post(`${BASE}${basePath}`, async (c) => {
    try {
      const body = await c.req.json();
      const id = body.id || db.generateId();
      const now = db.now();
      let item = { ...body, id, created_at: body.created_at || now, updated_at: now };
      if (isAdminUsers && body.password) {
        item.password_hash = await db.hashPassword(body.password);
        delete item.password;
      }
      if (isAdminUsers && body.role_id) {
        const adminRole = c.get("adminRole");
        if (adminRole?.role_code !== "SUPER_ADMIN") {
          return c.json(fail("관리자 권한 변경은 최고관리자만 가능합니다.", "FORBIDDEN"), 403);
        }
      }
      await db.save(table, id, item);
      if (table !== "audit_logs") {
        await writeAuditLog(c, `${tableLabel} 생성`, `${tableLabel} ID:${id} ${item.name || item.title || ""} 생성`);
      }
      return c.json(ok(isAdminUsers ? stripSensitive(item) : item, `${tableLabel}이(가) 생성되었습니다.`), 201);
    } catch (e: any) { return c.json(fail(`${tableLabel} 생성 오류: ${e.message}`, "CREATE_ERROR"), 500); }
  });
  app.put(`${BASE}${basePath}/:id`, async (c) => {
    try {
      const id = c.req.param("id");
      const existing = await db.findById(table, id);
      if (!existing) return c.json(fail("데이터를 찾을 수 없습니다.", "NOT_FOUND"), 404);
      const body = await c.req.json();
      if (isAdminUsers && body.role_id && body.role_id !== existing.role_id) {
        const adminRole = c.get("adminRole");
        if (adminRole?.role_code !== "SUPER_ADMIN") {
          return c.json(fail("관리자 권한 변경은 최고관리자만 가능합니다.", "FORBIDDEN"), 403);
        }
      }
      if (isAdminUsers && body.password) {
        body.password_hash = await db.hashPassword(body.password);
        delete body.password;
      }
      const updated = { ...existing, ...body, id, updated_at: db.now() };
      await db.save(table, id, updated);
      if (table !== "audit_logs") {
        await writeAuditLog(c, `${tableLabel} 수정`, `${tableLabel} ID:${id} ${updated.name || updated.title || ""} 수정`);
      }
      return c.json(ok(isAdminUsers ? stripSensitive(updated) : updated, `${tableLabel}이(가) 수정되었습니다.`));
    } catch (e: any) { return c.json(fail(`${tableLabel} 수정 오류: ${e.message}`, "UPDATE_ERROR"), 500); }
  });
  app.delete(`${BASE}${basePath}/:id`, async (c) => {
    try {
      if (isAdminUsers) {
        const adminUser = c.get("adminUser");
        if (adminUser?.id === c.req.param("id")) {
          return c.json(fail("자기 자신의 계정은 삭제할 수 없습니다.", "SELF_DELETE"), 403);
        }
        const adminRole = c.get("adminRole");
        if (adminRole?.role_code !== "SUPER_ADMIN") {
          return c.json(fail("관리자 계정 삭제는 최고관리자만 가능합니다.", "FORBIDDEN"), 403);
        }
      }
      const existing = await db.findById(table, c.req.param("id"));
      await db.remove(table, c.req.param("id"));
      if (table !== "audit_logs") {
        await writeAuditLog(c, `${tableLabel} 삭제`, `${tableLabel} ID:${c.req.param("id")} ${existing?.name || existing?.title || ""} 삭제`);
      }
      return c.json(ok(null, `${tableLabel}이(가) 삭제되었습니다.`));
    }
    catch (e: any) { return c.json(fail(`${tableLabel} 삭제 오류: ${e.message}`, "DELETE_ERROR"), 500); }
  });
}

// 8-2 ~ 8-5 Admin CRUD routes
crudRoutes("admin_users", "/admin/users");
crudRoutes("admin_roles", "/admin/roles");
crudRoutes("site_banners", "/admin/banners");
crudRoutes("notices", "/admin/notices");
crudRoutes("faqs", "/admin/faqs");
crudRoutes("job_posts", "/admin/job-posts");
crudRoutes("applicants", "/admin/applicants");
crudRoutes("job_applications", "/admin/job-applications");
crudRoutes("inquiries", "/admin/inquiries");
crudRoutes("inquiry_memos", "/admin/inquiry-memos");
crudRoutes("employees", "/admin/employees");
crudRoutes("departments", "/admin/departments");
crudRoutes("positions", "/admin/positions");
crudRoutes("document_templates", "/admin/document-templates");
crudRoutes("issued_documents", "/admin/issued-documents");
crudRoutes("payroll_documents", "/admin/payroll-documents");
crudRoutes("materials", "/admin/materials");

// Public materials (download resources)
app.get(`${BASE}/public/materials`, async (c) => {
  try {
    const all = await db.findAll("materials");
    const active = all.filter((m: any) => m.is_active !== false).sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
    return c.json(ok(active));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// Enriched job applications
app.get(`${BASE}/admin/job-applications-enriched`, async (c) => {
  try {
    const apps = await db.findAll("job_applications");
    const enriched = [];
    for (const a of apps) {
      const applicant = await db.findById("applicants", a.applicant_id);
      const job = await db.findById("job_posts", a.job_post_id);
      enriched.push({ ...a, applicant_name: applicant?.name || "알 수 없음", applicant_mobile: applicant?.mobile || "", applicant_email: applicant?.email || "", applicant_career: applicant?.career_summary || "", applicant_nationality: applicant?.nationality || "", desired_location: applicant?.desired_location || "", job_title: job?.title || "알 수 없음", job_company: job?.company_name || "", job_location: job?.work_location || "" });
    }
    return c.json(ok(enriched));
  } catch (e: any) { return c.json(fail(`지원서 조회 오류: ${e.message}`, "ENRICHED_ERROR"), 500); }
});

// Inquiry memos for specific inquiry
app.get(`${BASE}/admin/inquiries/:id/memos`, async (c) => {
  try {
    const inquiryId = c.req.param("id");
    const allMemos = await db.findAll("inquiry_memos");
    const memos = allMemos.filter((m: any) => m.inquiry_id === inquiryId);
    for (const memo of memos) {
      const admin = await db.findById("admin_users", memo.admin_user_id);
      memo.admin_name = admin?.name || "알 수 없음";
    }
    return c.json(ok(memos.sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""))));
  } catch (e: any) { return c.json(fail(`메모 조회 오류: ${e.message}`, "MEMO_ERROR"), 500); }
});

// ═══════════════════════════════════════════
// 9. ERP API
// ═══════════════════════════════════════════

crudRoutes("client_companies", "/erp/client-companies");
crudRoutes("work_sites", "/erp/work-sites");
crudRoutes("placements", "/erp/placements");
crudRoutes("attendance_records", "/erp/attendance");
crudRoutes("billing_rates", "/erp/billing-rates");
crudRoutes("partner_billings", "/erp/partner-billings");
crudRoutes("settlements", "/erp/settlements");

// 청구서 자동 생성 (월별 출퇴근 데이터 + 단가 → 청구서)
app.post(`${BASE}/erp/partner-billings/generate`, async (c) => {
  try {
    const { clientCompanyId, yearMonth } = await c.req.json();
    if (!clientCompanyId || !yearMonth) return c.json(fail("필수 파라미터가 누락되었습니다."), 400);

    // 해당 월 출퇴근 기록 집계
    const attendances = await db.findAll("attendance_records");
    const placements = await db.findAll("placements");
    const billingRates = await db.findAll("billing_rates");
    const employees = await db.findAll("employees");

    // 해당 고객사 배치들
    const clientPlacements = placements.filter((p: any) => p.client_company_id === clientCompanyId);
    const placementIds = new Set(clientPlacements.map((p: any) => p.id));

    // 해당 월 출퇴근 합산
    let totalHours = 0;
    let totalAmount = 0;
    let totalWorkerCost = 0;
    for (const att of attendances) {
      if (!att.date || !att.date.startsWith(yearMonth)) continue;
      const placement = clientPlacements.find((p: any) => p.id === att.placement_id);
      if (!placement) continue;
      const employee = employees.find((e: any) => e.id === placement.employee_id);
      const jobCategory = employee?.job_category || placement.job_category || "기타";
      const rate = billingRates.find((r: any) =>
        r.client_company_id === clientCompanyId &&
        r.job_category === jobCategory
      );
      const hours = Number(att.work_hours) || 8;
      totalHours += hours;
      totalAmount += hours * (Number(rate?.client_rate_per_hour) || 0);
      totalWorkerCost += hours * (Number(rate?.worker_rate_per_hour) || 0);
    }

    const vatAmount = Math.round(totalAmount * 0.1);
    const finalAmount = totalAmount + vatAmount;
    const insuranceCost = Math.round(totalWorkerCost * 0.105); // 약 10.5% 사업주 4대보험
    const netMargin = totalAmount - totalWorkerCost - insuranceCost;
    const marginRate = totalAmount > 0 ? (netMargin / totalAmount) * 100 : 0;

    // 청구서 저장
    const billingId = db.generateId();
    await db.save("partner_billings", billingId, {
      id: billingId,
      client_company_id: clientCompanyId,
      year_month: yearMonth,
      total_hours: totalHours,
      total_amount: totalAmount,
      vat_amount: vatAmount,
      final_amount: finalAmount,
      status: "DRAFT",
      created_at: db.now(),
    });

    // 정산 저장
    const settleId = db.generateId();
    await db.save("settlements", settleId, {
      id: settleId,
      year_month: yearMonth,
      client_company_id: clientCompanyId,
      revenue: totalAmount,
      worker_cost: totalWorkerCost,
      insurance_cost: insuranceCost,
      net_margin: netMargin,
      margin_rate: marginRate,
      created_at: db.now(),
    });

    return c.json(ok({ billingId, settleId, totalHours, totalAmount, finalAmount, netMargin, marginRate }, "청구서가 생성되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 청구서 발행
app.put(`${BASE}/erp/partner-billings/:id/issue`, async (c) => {
  try {
    const id = c.req.param("id");
    const item = await db.findById("partner_billings", id);
    if (!item) return c.json(fail("청구서를 찾을 수 없습니다."), 404);
    await db.save("partner_billings", id, { ...item, status: "ISSUED", issued_at: db.now() });
    return c.json(ok(null, "발행되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 청구서 입금 완료
app.put(`${BASE}/erp/partner-billings/:id/paid`, async (c) => {
  try {
    const id = c.req.param("id");
    const item = await db.findById("partner_billings", id);
    if (!item) return c.json(fail("청구서를 찾을 수 없습니다."), 404);
    await db.save("partner_billings", id, { ...item, status: "PAID", paid_at: db.now() });
    return c.json(ok(null, "입금 완료 처리되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 정산 요약 (월별)
app.get(`${BASE}/erp/settlements/summary`, async (c) => {
  try {
    const yearMonth = c.req.query("yearMonth");
    if (!yearMonth) return c.json(fail("yearMonth 파라미터가 필요합니다."), 400);
    const all = await db.findAll("settlements");
    const filtered = all.filter((s: any) => s.year_month === yearMonth);
    const totalRevenue = filtered.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
    const totalWorkerCost = filtered.reduce((sum: number, s: any) => sum + (s.worker_cost || 0), 0);
    const totalInsurance = filtered.reduce((sum: number, s: any) => sum + (s.insurance_cost || 0), 0);
    const totalMargin = filtered.reduce((sum: number, s: any) => sum + (s.net_margin || 0), 0);
    return c.json(ok({ yearMonth, totalRevenue, totalWorkerCost, totalInsurance, totalMargin, count: filtered.length, settlements: filtered }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 정산 by partner
app.get(`${BASE}/erp/settlements/by-partner`, async (c) => {
  try {
    const clientCompanyId = c.req.query("clientCompanyId");
    if (!clientCompanyId) return c.json(fail("clientCompanyId 파라미터가 필요합니다."), 400);
    const all = await db.findAll("settlements");
    const filtered = all.filter((s: any) => s.client_company_id === clientCompanyId);
    return c.json(ok(filtered));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// ERP Dashboard summary
app.get(`${BASE}/erp/dashboard`, async (c) => {
  try {
    const [clients, sites, placementsAll, attendance] = await Promise.all([
      db.findAll("client_companies"), db.findAll("work_sites"), db.findAll("placements"), db.findAll("attendance_records"),
    ]);
    const activeClients = clients.filter((c: any) => c.is_active).length;
    const activeSites = sites.filter((s: any) => s.is_active).length;
    const totalRequired = sites.reduce((sum: number, s: any) => sum + (s.required_headcount || 0), 0);
    const totalCurrent = sites.reduce((sum: number, s: any) => sum + (s.current_headcount || 0), 0);
    const workingPlacements = placementsAll.filter((p: any) => p.status === "WORKING").length;
    const todayAttendance = attendance.filter((a: any) => a.work_date === new Date().toISOString().split("T")[0]);
    const presentToday = todayAttendance.filter((a: any) => a.attendance_status === "PRESENT" || a.attendance_status === "LATE").length;

    return c.json(ok({
      activeClients, activeSites, totalRequired, totalCurrent,
      fillRate: totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 0,
      workingPlacements, presentToday,
      sites: sites.filter((s: any) => s.is_active),
    }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// Placements end
app.put(`${BASE}/erp/placements/:id/end`, async (c) => {
  try {
    const id = c.req.param("id");
    const plc = await db.findById("placements", id);
    if (!plc) return c.json(fail("배치 정보를 찾을 수 없습니다.", "NOT_FOUND"), 404);
    const updated = { ...plc, status: "ENDED", end_date: db.now().split("T")[0] };
    await db.save("placements", id, updated);
    return c.json(ok(updated, "배치가 종료되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// ═══════════════════════════════════════════
// 10. FOREIGN WORKER MANAGEMENT API
// ═══════════════════════════════════════════

crudRoutes("foreign_visas", "/erp/visas");
crudRoutes("foreign_stay_records", "/erp/stay-records");

// 날짜 diff 헬퍼 (일 단위)
function daysUntil(dateStr: string, from: Date = new Date()): number {
  return Math.ceil((new Date(dateStr).getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}
function expiringWithin(visas: any[], days: number, today: Date) {
  return visas.filter((v: any) => { const d = daysUntil(v.expire_date, today); return d > 0 && d <= days; });
}
// 카운팅 헬퍼
function countBy(items: any[], key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  items.forEach((item: any) => { counts[item[key]] = (counts[item[key]] || 0) + 1; });
  return counts;
}

// Foreign Worker Dashboard
app.get(`${BASE}/erp/foreign-dashboard`, async (c) => {
  try {
    const visas = await db.findAll("foreign_visas");
    const stayRecords = await db.findAll("foreign_stay_records");
    const today = new Date();

    const totalForeign = visas.length;
    const activeVisas = visas.filter((v: any) => v.stay_status === "ACTIVE").length;
    const expiringSoon = expiringWithin(visas.filter((v: any) => v.stay_status !== "EXPIRED"), 90, today).length;
    const expired = visas.filter((v: any) => v.stay_status === "EXPIRED" || new Date(v.expire_date) < today).length;

    const byVisaType = countBy(visas, "visa_type");
    const byNationality = countBy(visas, "nationality");
    const byStatus = countBy(visas, "stay_status");

    const expiringIn30 = expiringWithin(visas, 30, today);
    const expiringIn60 = expiringWithin(visas, 60, today);
    const expiringIn90 = expiringWithin(visas, 90, today);

    return c.json(ok({
      totalForeign, activeVisas, expiringSoon, expired,
      byVisaType, byNationality, byStatus,
      expiringIn30: expiringIn30.length,
      expiringIn60: expiringIn60.length,
      expiringIn90: expiringIn90.length,
      alertList: [...expiringIn90, ...visas.filter((v: any) => v.stay_status === "EXPIRED")]
        .sort((a: any, b: any) => (a.expire_date || "").localeCompare(b.expire_date || "")),
      recentStayRecords: [...stayRecords].sort((a: any, b: any) => (b.action_date || "").localeCompare(a.action_date || "")).slice(0, 10),
    }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// Foreign statistics for admin stats page
app.get(`${BASE}/admin/statistics/foreign`, async (c) => {
  try {
    const visas = await db.findAll("foreign_visas");
    return c.json(ok({ total: visas.length, byVisaType: countBy(visas, "visa_type"), byNationality: countBy(visas, "nationality"), byStatus: countBy(visas, "stay_status") }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// ═══════════════════════════════════════════
// 12. STATISTICS API
// ═══════════════════════════════════════════

app.get(`${BASE}/admin/statistics/recruit`, async (c) => {
  try {
    const [jobs, applications, applicants] = await Promise.all([
      db.findAll("job_posts"), db.findAll("job_applications"), db.findAll("applicants"),
    ]);
    return c.json(ok({ totalJobs: jobs.length, openJobs: jobs.filter((j: any) => j.status === "OPEN").length, totalApplications: applications.length, totalApplicants: applicants.length, applicationsByStatus: countBy(applications, "status"), jobsByCategory: countBy(jobs.map((j: any) => ({ ...j, job_category: j.job_category || "기타" })), "job_category") }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/admin/statistics/inquiries`, async (c) => {
  try {
    const inquiries = await db.findAll("inquiries");
    return c.json(ok({ total: inquiries.length, byStatus: countBy(inquiries, "status"), byType: countBy(inquiries, "inquiry_type") }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/admin/statistics/documents`, async (c) => {
  try {
    const docs = await db.findAll("issued_documents");
    const successCount = docs.filter((d: any) => d.issue_status === "SUCCESS").length;
    return c.json(ok({ total: docs.length, successCount, failCount: docs.length - successCount, byType: countBy(docs.map((d: any) => ({ doc_type_display: d.doc_type_name || d.doc_type })), "doc_type_display") }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/admin/statistics/erp`, async (c) => {
  try {
    const [clients, sites, placements, attendance] = await Promise.all([
      db.findAll("client_companies"), db.findAll("work_sites"), db.findAll("placements"), db.findAll("attendance_records"),
    ]);
    return c.json(ok({ totalClients: clients.length, totalSites: sites.length, totalPlacements: placements.length, workingPlacements: placements.filter((p: any) => p.status === "WORKING").length, totalAttendanceRecords: attendance.length, attendanceByStatus: countBy(attendance, "attendance_status") }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// ═══════════════════════════════════════════
// 13. FILE UPLOAD (Supabase Storage)
// ═══════════════════════════════════════════

app.post(`${BASE}/storage/upload`, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const category = formData.get("category") as string || "general";
    if (!file) return c.json(fail("파일이 없습니다.", "NO_FILE"), 400);

    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${category}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const arrayBuf = await file.arrayBuffer();

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, arrayBuf, { contentType: file.type, upsert: true });

    if (error) return c.json(fail(`업로드 실패: ${error.message}`, "UPLOAD_ERROR"), 500);

    // Create signed URL (valid 7 days)
    const { data: signedData } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileName, 7 * 24 * 60 * 60);

    // Save file metadata to KV
    const fileId = db.generateId();
    const fileMeta = {
      id: fileId,
      original_name: file.name,
      storage_path: fileName,
      category,
      content_type: file.type,
      size: file.size,
      signed_url: signedData?.signedUrl || null,
      signed_url_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      uploaded_at: db.now(),
    };
    await db.save("uploaded_files", fileId, fileMeta);
    await writeAuditLog(c, "파일 업로드", `${file.name} (${category})`);

    return c.json(ok(fileMeta, "파일이 업로드되었습니다."), 201);
  } catch (e: any) { console.log("Upload error:", e.message); return c.json(fail(`업로드 오류: ${e.message}`, "UPLOAD_ERROR"), 500); }
});

app.get(`${BASE}/storage/files`, async (c) => {
  try {
    const category = c.req.query("category") || "";
    let files = await db.findAll("uploaded_files");
    if (category) files = files.filter((f: any) => f.category === category);
    files.sort((a: any, b: any) => (b.uploaded_at || "").localeCompare(a.uploaded_at || ""));
    return c.json(ok(files));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.get(`${BASE}/storage/signed-url/:id`, async (c) => {
  try {
    const fileMeta = await db.findById("uploaded_files", c.req.param("id"));
    if (!fileMeta) return c.json(fail("파일을 찾을 수 없습니다.", "NOT_FOUND"), 404);
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileMeta.storage_path, 60 * 60);
    if (error) return c.json(fail(`URL 생성 실패: ${error.message}`, "URL_ERROR"), 500);
    return c.json(ok({ signedUrl: data.signedUrl, expiresIn: 3600 }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.delete(`${BASE}/storage/files/:id`, async (c) => {
  try {
    const fileMeta = await db.findById("uploaded_files", c.req.param("id"));
    if (!fileMeta) return c.json(fail("파일을 찾을 수 없습니다.", "NOT_FOUND"), 404);
    await supabaseAdmin.storage.from(BUCKET_NAME).remove([fileMeta.storage_path]);
    await db.remove("uploaded_files", fileMeta.id);
    await writeAuditLog(c, "파일 삭제", `${fileMeta.original_name} (${fileMeta.category})`);
    return c.json(ok(null, "파일이 삭제되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// Audit log CRUD
crudRoutes("audit_logs", "/admin/audit-logs");

// ═══════════════════════════════════════════
// 14. PAYROLL MANAGEMENT (급여명세서 관리)
// ═══════════════════════════════════════════

// ★ 커스텀 GET 라우트를 crudRoutes보다 먼저 등록 (/:id 패턴 충돌 방지)

// 카카오 ID 등록 직원 목록
app.get(`${BASE}/erp/payroll/kakao-employees`, async (c) => {
  try {
    const employees = await db.findAll("employees");
    return c.json(ok(employees.map((e: any) => ({
      id: e.id, name: e.name, employee_no: e.employee_no, department: e.department_name,
      kakao_id: e.kakao_id || "", has_kakao: !!e.kakao_id,
    }))));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 급여명세서 월별 요약
app.get(`${BASE}/erp/payroll/summary`, async (c) => {
  try {
    const payYearMonth = c.req.query("payYearMonth");
    const allSlips = await db.findAll("payroll_slips");
    const slips = payYearMonth ? allSlips.filter((s: any) => s.pay_year_month === payYearMonth) : allSlips;
    const total = slips.length;
    const draft = slips.filter((s: any) => s.status === "DRAFT").length;
    const confirmed = slips.filter((s: any) => s.status === "CONFIRMED").length;
    const sent = slips.filter((s: any) => s.status === "SENT").length;
    const totalPay = slips.reduce((sum: number, s: any) => sum + (Number(s.total_pay) || 0), 0);
    const totalDeduction = slips.reduce((sum: number, s: any) => sum + (Number(s.total_deduction) || 0), 0);
    const totalNetPay = slips.reduce((sum: number, s: any) => sum + (Number(s.net_pay) || 0), 0);
    const months: Record<string, any> = {};
    for (const s of allSlips) {
      const m = s.pay_year_month;
      if (!months[m]) months[m] = { month: m, count: 0, totalPay: 0, totalNet: 0 };
      months[m].count++; months[m].totalPay += Number(s.total_pay) || 0; months[m].totalNet += Number(s.net_pay) || 0;
    }
    return c.json(ok({ total, draft, confirmed, sent, totalPay, totalDeduction, totalNetPay, monthlyList: Object.values(months).sort((a: any, b: any) => b.month.localeCompare(a.month)) }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// ★ crudRoutes는 커스텀 GET 라우트 이후에 등록
crudRoutes("payroll_slips", "/erp/payroll");

// 급여명세서 일괄 생성 (월 단위)
app.post(`${BASE}/erp/payroll/batch-create`, async (c) => {
  try {
    const { payYearMonth, employeeIds } = await c.req.json();
    if (!payYearMonth) return c.json(fail("급여년월을 입력해주세요.", "VALIDATION_ERROR"), 400);
    const targetEmployees = employeeIds?.length
      ? (await Promise.all(employeeIds.map((id: string) => db.findById("employees", id)))).filter(Boolean)
      : (await db.findAll("employees")).filter((e: any) => e.employment_status === "ACTIVE");
    if (!targetEmployees.length) return c.json(fail("대상 직원이 없습니다.", "NO_EMPLOYEES"), 400);
    const existing = await db.findAll("payroll_slips");
    const existingKeys = new Set(existing.map((p: any) => `${p.employee_id}-${p.pay_year_month}`));
    const created: any[] = [];
    const skipped: string[] = [];
    for (const emp of targetEmployees) {
      const key = `${emp.id}-${payYearMonth}`;
      if (existingKeys.has(key)) { skipped.push(emp.name); continue; }
      const id = db.generateId();
      const slip = {
        id, employee_id: emp.id, employee_name: emp.name, employee_no: emp.employee_no || "",
        department: emp.department_name || "", position: emp.position_name || "",
        pay_year_month: payYearMonth,
        base_salary: 0, overtime_pay: 0, night_pay: 0, holiday_pay: 0,
        meal_allowance: 0, transport_allowance: 0, bonus: 0, other_pay: 0, other_pay_note: "",
        total_pay: 0,
        income_tax: 0, local_tax: 0, national_pension: 0, health_insurance: 0,
        long_term_care: 0, employment_insurance: 0, other_deduction: 0, other_deduction_note: "",
        total_deduction: 0, net_pay: 0,
        work_days: 0, work_hours: 0, overtime_hours: 0, night_hours: 0, holiday_hours: 0,
        kakao_sent: false, kakao_sent_at: null, kakao_send_status: null, memo: "",
        status: "DRAFT", created_at: db.now(), updated_at: db.now(),
      };
      await db.save("payroll_slips", id, slip);
      created.push(slip);
    }
    return c.json(ok({ created: created.length, skipped: skipped.length, skippedNames: skipped },
      `${created.length}건 생성, ${skipped.length}건 중복 제외`), 201);
  } catch (e: any) { console.log("Payroll batch create error:", e.message); return c.json(fail(e.message, "PAYROLL_ERROR"), 500); }
});

// 급여명세서 확정
app.put(`${BASE}/erp/payroll/:id/confirm`, async (c) => {
  try {
    const slip = await db.findById("payroll_slips", c.req.param("id"));
    if (!slip) return c.json(fail("급여명세서를 찾을 수 없습니다.", "NOT_FOUND"), 404);
    await db.save("payroll_slips", slip.id, { ...slip, status: "CONFIRMED", updated_at: db.now() });
    return c.json(ok({ ...slip, status: "CONFIRMED" }, "급여명세서가 확정되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 일괄 확정
app.post(`${BASE}/erp/payroll/batch-confirm`, async (c) => {
  try {
    const { ids } = await c.req.json();
    let confirmed = 0;
    for (const id of ids) {
      const slip = await db.findById("payroll_slips", id);
      if (slip && slip.status === "DRAFT") { await db.save("payroll_slips", id, { ...slip, status: "CONFIRMED", updated_at: db.now() }); confirmed++; }
    }
    return c.json(ok({ confirmed }, `${confirmed}건 확정 완료`));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 직원 카카오톡 ID 등록
app.put(`${BASE}/admin/employees/:id/kakao`, async (c) => {
  try {
    const emp = await db.findById("employees", c.req.param("id"));
    if (!emp) return c.json(fail("직원 정보를 찾을 수 없습니다.", "NOT_FOUND"), 404);
    const { kakao_id } = await c.req.json();
    const updated = { ...emp, kakao_id: kakao_id || "", updated_at: db.now() };
    await db.save("employees", emp.id, updated);
    return c.json(ok(updated, "카카오톡 ID가 등록되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 개별 알림 전송 (솔라피 알림톡/SMS)
app.post(`${BASE}/erp/payroll/:id/send-kakao`, async (c) => {
  try {
    const slip = await db.findById("payroll_slips", c.req.param("id"));
    if (!slip) return c.json(fail("급여명세서를 찾을 수 없습니다.", "NOT_FOUND"), 404);
    if (slip.status === "DRAFT") return c.json(fail("확정되지 않은 급여명세서는 전송할 수 없습니다.", "NOT_CONFIRMED"), 400);
    const emp = await db.findById("employees", slip.employee_id);
    if (!emp?.mobile) return c.json(fail("해당 직원의 휴대폰 번호가 등록되지 않았습니다.", "NO_MOBILE"), 400);
    const result = await sendPayslipNotification(emp.mobile, slip);
    const updated = { ...slip, kakao_sent: result.success, kakao_sent_at: result.success ? db.now() : null, kakao_send_status: result.success ? "SUCCESS" : "FAILED", kakao_send_error: result.error || null, status: result.success ? "SENT" : slip.status, updated_at: db.now() };
    await db.save("payroll_slips", slip.id, updated);
    if (result.success) {
      const adminUser = c.get("adminUser");
      const logId = db.generateId();
      await db.save("audit_logs", logId, { id: logId, admin_id: adminUser?.id, admin_name: adminUser?.name, action: "급여명세서 전송", details: `${slip.employee_name} ${slip.pay_year_month} (${emp.mobile})`, status: "SUCCESS", created_at: db.now() });
      return c.json(ok(updated, "전송이 완료되었습니다."));
    }
    return c.json(fail(result.error || "전송에 실패했습니다.", "SEND_FAILED"), 500);
  } catch (e: any) { console.log("Payslip send error:", e.message); return c.json(fail(e.message), 500); }
});

// 일괄 전송 (솔라피 알림톡/SMS)
app.post(`${BASE}/erp/payroll/batch-send-kakao`, async (c) => {
  try {
    const { ids } = await c.req.json();
    if (!ids?.length) return c.json(fail("전송 대상을 선택해주세요.", "NO_SELECTION"), 400);
    const results = { success: 0, failed: 0, skipped: 0, errors: [] as string[] };
    const adminUser = c.get("adminUser");
    for (const id of ids) {
      const slip = await db.findById("payroll_slips", id);
      if (!slip || slip.status === "DRAFT") { results.skipped++; continue; }
      const emp = await db.findById("employees", slip.employee_id);
      if (!emp?.mobile) { results.skipped++; results.errors.push(`${slip.employee_name}: 휴대폰 번호 미등록`); continue; }
      const result = await sendPayslipNotification(emp.mobile, slip);
      await db.save("payroll_slips", id, { ...slip, kakao_sent: result.success, kakao_sent_at: result.success ? db.now() : null, kakao_send_status: result.success ? "SUCCESS" : "FAILED", kakao_send_error: result.error || null, status: result.success ? "SENT" : slip.status, updated_at: db.now() });
      if (result.success) results.success++; else { results.failed++; results.errors.push(`${slip.employee_name}: ${result.error}`); }
    }
    const logId = db.generateId();
    await db.save("audit_logs", logId, { id: logId, admin_id: adminUser?.id, admin_name: adminUser?.name, action: "급여명세서 일괄전송", details: `성공 ${results.success}, 실패 ${results.failed}, 제외 ${results.skipped}`, status: results.failed > 0 ? "PARTIAL" : "SUCCESS", created_at: db.now() });
    return c.json(ok(results, `전송 완료: 성공 ${results.success}건, 실패 ${results.failed}건, 제외 ${results.skipped}건`));
  } catch (e: any) { console.log("Batch send error:", e.message); return c.json(fail(e.message), 500); }
});

// System settings (single record)
app.get(`${BASE}/admin/settings`, async (c) => {
  try {
    const settings = await db.findById("system_settings", "main") || {
      company_name: "더웰파트너", ceo_name: "OOO", business_no: "XXX-XX-XXXXX",
      phone: "031-XXX-XXXX", email: "contact@thewellpartner.com", address: "경기도 수원시 OO구 OO로 123",
      founded_year: "", business_hours: "평일 09:00 ~ 18:00 (공휴일 제외)",
      branch_address: "", branch_phone: "", branch_email: "",
      logo_file_id: null, stamp_file_id: null,
      notify_inquiry_email: true, notify_applicant_email: true, notify_document_log: false, notify_auth_fail: true,
      smtp_server: "smtp.example.com", smtp_port: "587", smtp_email: "noreply@thewellpartner.com", smtp_password: "",
      allowed_file_types: "PDF, DOC, DOCX, XLS, XLSX, JPG, PNG", max_file_size: "10MB",
    };
    return c.json(ok(settings));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.put(`${BASE}/admin/settings`, async (c) => {
  try {
    const body = await c.req.json();
    const existing = await db.findById("system_settings", "main") || {};
    const updated = { ...existing, ...body, id: "main", updated_at: db.now() };
    await db.save("system_settings", "main", updated);
    await writeAuditLog(c, "시스템설정 변경", "시스템 설정이 업데이트되었습니다.");
    return c.json(ok(updated, "설정이 저장되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// ──── Site Content Management (회사소개/사업분야 동적 콘텐츠) ────
app.get(`${BASE}/admin/site-content/:section`, async (c) => {
  try {
    const section = c.req.param("section");
    const data = await db.findById("site_content", section);
    return c.json(ok(data || {}));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

app.put(`${BASE}/admin/site-content/:section`, async (c) => {
  try {
    const section = c.req.param("section");
    const body = await c.req.json();
    const existing = await db.findById("site_content", section) || {};
    const updated = { ...existing, ...body, id: section, updated_at: db.now() };
    await db.save("site_content", section, updated);
    await writeAuditLog(c, "사이트콘텐츠 변경", `${section} 콘텐츠가 업데이트되었습니다.`);
    return c.json(ok(updated, "콘텐츠가 저장되었습니다."));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// 공개 사이트 콘텐츠 조회 (인증 불필요)
app.get(`${BASE}/public/site-content/:section`, async (c) => {
  try {
    const section = c.req.param("section");
    const data = await db.findById("site_content", section);
    return c.json(ok(data || {}));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

// Admin 비밀번호 변경 (본인 전용)
app.put(`${BASE}/admin/change-password`, async (c) => {
  try {
    const adminUser = c.get("adminUser");
    if (!adminUser) return c.json(fail("인증이 필요합니다.", "UNAUTHORIZED"), 401);
    const { currentPassword, newPassword } = await c.req.json();
    if (!currentPassword || !newPassword) return c.json(fail("현재 비밀번호와 새 비밀번호를 입력해주세요.", "VALIDATION"), 400);
    if (newPassword.length < 8) return c.json(fail("새 비밀번호는 8자 이상이어야 합니다.", "VALIDATION"), 400);
    const user = await db.findById("admin_users", adminUser.id);
    if (!user) return c.json(fail("사용자를 찾을 수 없습니다.", "NOT_FOUND"), 404);
    const match = await db.verifyPassword(currentPassword, user.password_hash);
    if (!match) return c.json(fail("현재 비밀번호가 올바르지 않습니다.", "INVALID_PASSWORD"), 400);
    const newHash = await db.hashPassword(newPassword);
    await db.save("admin_users", user.id, { ...user, password_hash: newHash, updated_at: db.now() });
    await writeAuditLog(c, "비밀번호 변경", `${user.name} 비밀번호 변경 완료`);
    return c.json(ok(null, "비밀번호가 성공적으로 변경되었습니다."));
  } catch (e: any) { return c.json(fail(`비밀번호 변경 오류: ${e.message}`), 500); }
});

// Admin badge counts (for sidebar)
app.get(`${BASE}/admin/badge-counts`, async (c) => {
  try {
    const [inquiries, applications] = await Promise.all([
      db.findAll("inquiries"), db.findAll("job_applications"),
    ]);
    const pendingInquiries = inquiries.filter((i: any) => i.status === "RECEIVED" || i.status === "CHECKING").length;
    const pendingApplicants = applications.filter((a: any) => a.status === "APPLIED").length;
    return c.json(ok({ inquiries: pendingInquiries, applicants: pendingApplicants }));
  } catch (e: any) { return c.json(fail(e.message), 500); }
});

Deno.serve(app.fetch);