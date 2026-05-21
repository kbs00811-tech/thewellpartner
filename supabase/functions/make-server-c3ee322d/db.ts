/**
 * 더웰파트너 통합 DB 레이어
 * KV Store를 활용한 테이블별 CRUD 헬퍼
 * 키 구조: {table}:{id}
 */
import * as kv from "./kv_store.ts";

// UUID 생성
export function generateId(): string {
  return crypto.randomUUID();
}

// 현재 시각 ISO 문자열
export function now(): string {
  return new Date().toISOString();
}

// ──────────────────────────────────────────────────────────
// 비밀번호 해싱
//  - 신규: PBKDF2-SHA256, 사용자별 랜덤 salt, 100k 반복
//    포맷: "pbkdf2$<iter>$<saltHex>$<hashHex>"
//  - 레거시: SHA-256 + 전역 salt (검증만 지원 → 로그인 시 자동 업그레이드)
// ──────────────────────────────────────────────────────────
const PBKDF2_ITER = 100_000;
const LEGACY_SALT = "twp-salt-2025-secure";

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array, iter: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

async function legacyHash(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(password + LEGACY_SALT));
  return toHex(hash);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashHex = await pbkdf2(password, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${toHex(salt.buffer)}$${hashHex}`;
}

// timing-safe 문자열 비교
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith("pbkdf2$")) {
    const [, iterStr, saltHex, hashHex] = stored.split("$");
    const computed = await pbkdf2(password, fromHex(saltHex), parseInt(iterStr, 10));
    return timingSafeEqual(computed, hashHex);
  }
  // 레거시 SHA-256 비교
  const computed = await legacyHash(password);
  return timingSafeEqual(computed, stored);
}

/** 저장된 해시가 레거시(약한) 포맷이면 true → 로그인 성공 시 재해싱 권장 */
export function needsRehash(stored: string): boolean {
  return !!stored && !stored.startsWith("pbkdf2$");
}

// ──────────────────────────────────────────────────────────
// Admin 토큰 — HMAC 서명 (위조 방지)
//  신규 포맷: twp-{userId}-{ts}-{hmacHex}
//  hmac = HMAC-SHA256(secret, "twp-{userId}-{ts}")
//  레거시(서명없음) 토큰은 ENFORCE_SIGNED_TOKENS=true 면 거부
// ──────────────────────────────────────────────────────────
function tokenSecret(): string {
  return (
    Deno.env.get("ADMIN_TOKEN_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "twp-token-secret-fallback-rotate-me"
  );
}

async function hmacHex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(tokenSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}

/** 서명된 admin 토큰 발급 */
export async function signToken(userId: string): Promise<string> {
  const ts = Date.now();
  const base = `twp-${userId}-${ts}`;
  const sig = await hmacHex(base);
  return `${base}-${sig}`;
}

// 마지막 세그먼트가 HMAC-SHA256(64 hex)이면 서명 토큰.
// (userId가 UUID/"admin-1"처럼 하이픈을 포함 → parts 개수로는 판별 불가)
const HMAC_RE = /^[0-9a-f]{64}$/;

/** 토큰 검증 → userId 또는 null. 만료(maxAgeMs) + 서명 검증. */
export async function verifyToken(token: string, maxAgeMs: number): Promise<string | null> {
  if (!token || !token.startsWith("twp-")) return null;
  const parts = token.split("-");
  if (parts.length < 3) return null;
  const enforce = Deno.env.get("ENFORCE_SIGNED_TOKENS") === "true";

  // 서명 토큰: twp-{userId}-{ts}-{hmac} (마지막=64 hex)
  if (HMAC_RE.test(parts[parts.length - 1])) {
    const sig = parts[parts.length - 1];
    const ts = parseInt(parts[parts.length - 2], 10);
    const userId = parts.slice(1, -2).join("-");
    if (isNaN(ts) || Date.now() - ts > maxAgeMs) return null;
    const expected = await hmacHex(`twp-${userId}-${ts}`);
    if (!timingSafeEqual(sig, expected)) return null;
    return userId;
  }

  // 레거시 토큰: twp-{userId}-{ts} (서명 없음)
  if (enforce) return null; // 강제 모드면 거부 → 재로그인 유도
  const ts = parseInt(parts[parts.length - 1], 10);
  if (isNaN(ts) || Date.now() - ts > maxAgeMs) return null;
  return parts.slice(1, -1).join("-");
}

// OTP 대기 토큰 — 비밀번호 검증 성공 후 발급(5분), OTP 검증 단계에서 소비.
//  포맷: otppending-{userId}-{ts}-{hmac}
export async function signPending(userId: string): Promise<string> {
  const ts = Date.now();
  const base = `otppending-${userId}-${ts}`;
  return `${base}-${await hmacHex(base)}`;
}
export async function verifyPending(token: string, maxAgeMs: number): Promise<string | null> {
  if (!token || !token.startsWith("otppending-")) return null;
  const parts = token.split("-");
  if (parts.length < 4) return null;
  const sig = parts[parts.length - 1];
  const ts = parseInt(parts[parts.length - 2], 10);
  const userId = parts.slice(1, -2).join("-");
  if (isNaN(ts) || Date.now() - ts > maxAgeMs) return null;
  const expected = await hmacHex(`otppending-${userId}-${ts}`);
  if (!timingSafeEqual(sig, expected)) return null;
  return userId;
}

// Admin 토큰 파싱 (레거시 호환 — 서명검증 없이 userId만 추출)
export function parseAdminToken(token: string): string | null {
  if (!token || !token.startsWith("twp-")) return null;
  const parts = token.split("-");
  if (parts.length < 3) return null;
  // 서명 토큰(마지막=64hex): 마지막2개(ts,hmac) 제외 / 레거시: 마지막1개(ts) 제외
  const drop = HMAC_RE.test(parts[parts.length - 1]) ? 2 : 1;
  return parts.slice(1, -drop).join("-");
}

// ──────────────────────────────────────────────────────────
// TOTP (RFC 6238) — 2단계 인증
// ──────────────────────────────────────────────────────────
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(str: string): Uint8Array {
  const clean = str.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(out);
}

/** 신규 OTP 시크릿 생성 (base32, 20바이트) */
export function generateOtpSecret(): string {
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(4, counter >>> 0, false);
  view.setUint32(0, Math.floor(counter / 2 ** 32), false);
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const offset = sig[sig.length - 1] & 0xf;
  const code = ((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3];
  return (code % 1_000_000).toString().padStart(6, "0");
}

/** TOTP 코드 검증 (±window 30초 step 허용) */
export async function verifyTotp(secretB32: string, code: string, window = 1): Promise<boolean> {
  if (!secretB32 || !/^\d{6}$/.test((code || "").trim())) return false;
  const secret = base32Decode(secretB32);
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    if (timingSafeEqual(await hotp(secret, step + w), code.trim())) return true;
  }
  return false;
}

/** 인증앱 등록용 otpauth URI */
export function otpauthUri(secretB32: string, account: string, issuer = "더웰파트너"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

// Doc 토큰 파싱 (doc-{employeeId}-{timestamp})
export function parseDocToken(token: string): string | null {
  if (!token || !token.startsWith("doc-")) return null;
  const parts = token.split("-");
  if (parts.length < 3) return null;
  return parts.slice(1, -1).join("-");
}

// --- Generic CRUD ---

/** 단건 조회 */
export async function findById(table: string, id: string): Promise<any | null> {
  return await kv.get(`${table}:${id}`);
}

/** 단건 저장 (insert or update) */
export async function save(table: string, id: string, data: any): Promise<void> {
  await kv.set(`${table}:${id}`, { ...data, id });
}

/** 단건 삭제 */
export async function remove(table: string, id: string): Promise<void> {
  await kv.del(`${table}:${id}`);
}

/** 테이블 전체 조회 (prefix 기반) */
export async function findAll(table: string): Promise<any[]> {
  return await kv.getByPrefix(`${table}:`);
}

/** 테이블 전체 조회 + 필터 */
export async function findWhere(table: string, filter: (item: any) => boolean): Promise<any[]> {
  const all = await findAll(table);
  return all.filter(filter);
}

/** 테이블 전체 조회 + 정렬 */
export async function findAllSorted(table: string, sortKey: string, order: "asc" | "desc" = "asc"): Promise<any[]> {
  const all = await findAll(table);
  return all.sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (order === "asc") return av < bv ? -1 : av > bv ? 1 : 0;
    return av > bv ? -1 : av < bv ? 1 : 0;
  });
}

/** 카운트 */
export async function count(table: string): Promise<number> {
  const all = await findAll(table);
  return all.length;
}

/** 조건부 카운트 */
export async function countWhere(table: string, filter: (item: any) => boolean): Promise<number> {
  const all = await findAll(table);
  return all.filter(filter).length;
}

/** 여러 건 일괄 저장 */
export async function saveMany(table: string, items: any[]): Promise<void> {
  const keys = items.map((item) => `${table}:${item.id}`);
  await kv.mset(keys, items);
}

// --- Table-specific helpers ---

// 순번 자동 생성 (예: EMP-001)
export async function nextSeqNo(table: string, prefix: string, digits: number = 3): Promise<string> {
  const all = await findAll(table);
  const nums = all
    .map((item) => {
      const match = item.employee_no?.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(digits, "0")}`;
}