import axios from "axios";
import { isApiBusinessError } from "./api-business-error";
import { parseApiFailurePayload } from "./api-error-text";

function isNotFoundCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const normalized = code.toUpperCase();
  return normalized === "NOT_FOUND" || normalized === "HTTP_404" || normalized.includes("NOT_FOUND");
}

function isNotFoundMessage(message: string | null | undefined): boolean {
  if (!message?.trim()) return false;
  return message.toLowerCase().includes("not found");
}

/** True when the API indicates the requested record does not exist (404 / not-found envelope). */
export function isApiNotFoundError(error: unknown): boolean {
  if (axios.isAxiosError(error) && error.response?.status === 404) return true;

  if (isApiBusinessError(error)) {
    if (isNotFoundCode(error.errorCode)) return true;
    if (isNotFoundMessage(error.message)) return true;
  }

  const payload = parseApiFailurePayload(error);
  if (isNotFoundCode(payload.errorCode)) return true;
  if (isNotFoundMessage(payload.message)) return true;

  return false;
}
