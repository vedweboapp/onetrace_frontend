import { toastError } from "@/shared/feedback/app-toast";
import { parseApiFailurePayload, resolveApiErrorUserText } from "./api-error-text";

const TOASTED = Symbol("apiErrorToastShown");

export function markApiErrorToasted(error: unknown): void {
  if (error && typeof error === "object") {
    Object.defineProperty(error, TOASTED, { value: true, enumerable: false, configurable: true });
  }
}

export function wasApiErrorToasted(error: unknown): boolean {
  return !!(error && typeof error === "object" && (error as Record<symbol, unknown>)[TOASTED] === true);
}

export function getApiErrorDisplayMessage(error: unknown, fallback?: string): string {
  const text = resolveApiErrorUserText(parseApiFailurePayload(error));
  if (text !== "Request failed") return text;
  return fallback?.trim() || text;
}

/**
 * Show a backend API error once. Skips when the axios interceptor already toasted.
 * Uses `fallback` only when no API message/details are available.
 */
export function toastApiError(error: unknown, fallback?: string): void {
  if (wasApiErrorToasted(error)) return;

  const payload = parseApiFailurePayload(error);
  const fromApi = resolveApiErrorUserText(payload);
  const hasApiDetails = Boolean(payload.message?.trim() || (payload.errors?.length ?? 0) > 0);
  const text = hasApiDetails ? fromApi : (fallback?.trim() || fromApi);

  toastError(text);
  markApiErrorToasted(error);
}
