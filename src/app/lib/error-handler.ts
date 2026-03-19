/**
 * 통합 에러 처리 유틸리티
 * alert() 대신 toast 기반 일원화
 */
import { toast } from "sonner";
import { ApiError } from "./api";

interface HandleErrorOptions {
  fallback?: string;
  silent?: boolean; // true면 toast 표시 안 함
}

export function handleError(error: unknown, options: HandleErrorOptions = {}): string {
  const { fallback = "오류가 발생했습니다. 잠시 후 다시 시도해주세요.", silent = false } = options;

  let message = fallback;

  if (error instanceof ApiError) {
    message = error.message;
    // 401은 세션 만료 → useAuth에서 처리하므로 여기서는 조용히
    if (error.status === 401) {
      return message;
    }
  } else if (error instanceof Error) {
    message = error.message || fallback;
  } else if (typeof error === "string") {
    message = error;
  }

  if (!silent) {
    toast.error(message);
  }

  return message;
}

export function handleSuccess(message: string) {
  toast.success(message);
}

export function handleWarning(message: string) {
  toast.warning(message);
}

export function handleInfo(message: string) {
  toast.info(message);
}
