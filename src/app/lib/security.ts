/**
 * 보안 유틸리티 모듈
 * XSS 방지, Rate Limiting, 입력 검증
 */

// ──── XSS Sanitize ────
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

export function sanitizeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

export function sanitizeInput(value: unknown): unknown {
  if (typeof value === "string") return sanitizeHtml(value.trim());
  if (Array.isArray(value)) return value.map(sanitizeInput);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitizeInput(v)])
    );
  }
  return value;
}

// ──── Rate Limiter (클라이언트 사이드) ────
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lockedUntil: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

const DEFAULT_RATE_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60_000,      // 1분
  lockoutMs: 300_000,    // 5분 잠금
};

export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; remainingAttempts: number; lockoutRemainingMs: number } {
  const cfg = { ...DEFAULT_RATE_CONFIG, ...config };
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry) {
    entry = { count: 0, firstAttempt: now, lockedUntil: 0 };
    rateLimitStore.set(key, entry);
  }

  // 잠금 상태 확인
  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutRemainingMs: entry.lockedUntil - now,
    };
  }

  // 윈도우 초과 → 리셋
  if (now - entry.firstAttempt > cfg.windowMs) {
    entry.count = 0;
    entry.firstAttempt = now;
    entry.lockedUntil = 0;
  }

  entry.count++;

  if (entry.count > cfg.maxAttempts) {
    entry.lockedUntil = now + cfg.lockoutMs;
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutRemainingMs: cfg.lockoutMs,
    };
  }

  return {
    allowed: true,
    remainingAttempts: cfg.maxAttempts - entry.count,
    lockoutRemainingMs: 0,
  };
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// ──── 비밀번호 강도 검증 ────
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push("8자 이상이어야 합니다");
  if (!/[A-Za-z]/.test(password)) errors.push("영문자를 포함해야 합니다");
  if (!/[0-9]/.test(password)) errors.push("숫자를 포함해야 합니다");
  return { valid: errors.length === 0, errors };
}

// ──── 전화번호 포맷 검증 ────
export function isValidPhone(phone: string): boolean {
  return /^01[016789]-?\d{3,4}-?\d{4}$/.test(phone.replace(/\s/g, ""));
}

// ──── 이메일 검증 ────
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ──── 세션 토큰 유효성 ────
export function isTokenExpired(token: string, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  const parts = token.split("-");
  const ts = parseInt(parts[parts.length - 1], 10);
  if (isNaN(ts)) return true;
  return Date.now() - ts >= maxAgeMs;
}

// ──── Request Timeout Wrapper ────
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30_000, ...fetchInit } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  return fetch(input, { ...fetchInit, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}
