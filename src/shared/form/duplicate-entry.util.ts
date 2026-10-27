import { isApiBusinessError } from "@/core/errors/api-business-error";
import { getApiFieldErrorMap } from "@/shared/form/report-form-api-error.util";

export const DUPLICATE_ENTRY_ERROR_CODE = "DUPLICATE_ENTRY";

export type DuplicateEntryConflict = {
  existingId: number;
  /** Field keys from `errors` that triggered the duplicate (e.g. email, name, sku). */
  fieldKeys: string[];
  message: string;
  /** Existing record snapshot from the API `data` payload. */
  data: Record<string, unknown>;
};

function toPositiveId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/**
 * Parse a create-time `DUPLICATE_ENTRY` business error into a conflict payload.
 * Returns null when the error is not a usable duplicate-with-existing-row case.
 */
export function parseDuplicateEntryConflict(error: unknown): DuplicateEntryConflict | null {
  if (!isApiBusinessError(error)) return null;
  if ((error.errorCode ?? "").trim().toUpperCase() !== DUPLICATE_ENTRY_ERROR_CODE) return null;

  const data =
    error.data && typeof error.data === "object" && !Array.isArray(error.data)
      ? (error.data as Record<string, unknown>)
      : null;
  if (!data) return null;

  const existingId = toPositiveId(data.id);
  if (existingId == null) return null;

  const fieldMap = getApiFieldErrorMap(error);
  const fieldKeys = Object.keys(fieldMap).filter(
    (k) => k !== "non_field_errors" && k !== "detail" && k !== "__all__",
  );

  return {
    existingId,
    fieldKeys,
    message: error.message?.trim() || fieldMap[fieldKeys[0] ?? ""] || "Duplicate entry",
    data,
  };
}

/** Human-readable label for a duplicate-data key. */
export function duplicateEntryFieldLabel(key: string): string {
  const normalized = key.replace(/_/g, " ").trim();
  if (!normalized) return key;
  return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDuplicateEntryValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length ? value.map(formatDuplicateEntryValue).join(", ") : "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }
  return String(value);
}
