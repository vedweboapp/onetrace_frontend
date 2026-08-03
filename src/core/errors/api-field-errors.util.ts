import axios from "axios";
import { isApiBusinessError } from "@/core/errors/api-business-error";

/** True when API `errors` is a field-keyed object (DRF-style), not a plain string list. */
export function isFieldKeyedApiErrors(errors: unknown): boolean {
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return false;
  return Object.keys(errors as Record<string, unknown>).length > 0;
}

export function getRawApiErrors(error: unknown): unknown {
  if (isApiBusinessError(error)) return error.errors;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object" && "errors" in data) {
      return (data as { errors?: unknown }).errors;
    }
  }
  return null;
}
