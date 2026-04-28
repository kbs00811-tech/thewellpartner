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

// 비밀번호 해싱 (SHA-256 + salt)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "twp-salt-2025-secure");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 비밀번호 검증
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// Admin 토큰 파싱 (twp-{userId}-{timestamp})
export function parseAdminToken(token: string): string | null {
  if (!token || !token.startsWith("twp-")) return null;
  // Remove "twp-" prefix, then remove last segment (timestamp)
  const parts = token.split("-");
  if (parts.length < 3) return null;
  // parts[0] = "twp", parts[last] = timestamp, middle = userId
  return parts.slice(1, -1).join("-");
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