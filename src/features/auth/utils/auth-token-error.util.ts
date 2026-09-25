import axios from "axios";
import { isApiBusinessError } from "@/core/errors/api-business-error";
import { extractAllErrorMessages } from "@/core/errors/api-error-text";
import { useAuthStore } from "@/features/auth/store/auth.store";

const TOKEN_INVALID_RE =
  /token_not_valid|token is expired|given token not valid|not authenticated|authentication credentials were not provided|access token.*expired/i;

function collectAuthErrorHaystack(error: unknown): string {
  const parts: string[] = [];

  if (isApiBusinessError(error)) {
    if (error.errorCode) parts.push(error.errorCode);
    if (error.message) parts.push(error.message);
    parts.push(...extractAllErrorMessages(error.errors));
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (typeof obj.code === "string") parts.push(obj.code);
      if (typeof obj.error_code === "string") parts.push(obj.error_code);
      if (typeof obj.detail === "string") parts.push(obj.detail);
      if (typeof obj.message === "string") parts.push(obj.message);
    }
    parts.push(...extractAllErrorMessages(data));
    if (typeof error.message === "string") parts.push(error.message);
  } else if (error instanceof Error && error.message) {
    parts.push(error.message);
  }

  return parts.filter(Boolean).join(" ");
}

/**
 * True when the API rejected the access/refresh token (expired / not valid).
 * Does not treat login "wrong password" 401 as session expiry unless the body
 * explicitly says the token is invalid.
 */
export function isInvalidAuthTokenError(error: unknown): boolean {
  const haystack = collectAuthErrorHaystack(error);
  if (TOKEN_INVALID_RE.test(haystack)) return true;

  if (isApiBusinessError(error)) {
    const code = (error.errorCode ?? "").toLowerCase();
    if (
      code === "token_not_valid" ||
      code === "not_authenticated" ||
      code === "authentication_failed"
    ) {
      return true;
    }
  }

  // Generic 401 while a session token is stored → treat as expired session.
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return Boolean(useAuthStore.getState().accessToken);
  }

  return false;
}
