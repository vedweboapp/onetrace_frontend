import axios from "axios";
import { isApiBusinessError } from "@/core/errors/api-business-error";
import { getRawApiErrors } from "@/core/errors/api-field-errors.util";
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Existing row may be `data` or `errors.existing_data` (id can be a string). */
function readExistingSnapshot(source: unknown): { id: number; data: Record<string, unknown> } | null {
  const row = asRecord(source);
  if (!row) return null;
  const directId = toPositiveId(row.id);
  if (directId != null) return { id: directId, data: row };
  const nested = asRecord(row.existing_data);
  const nestedId = nested ? toPositiveId(nested.id) : null;
  if (nested && nestedId != null) return { id: nestedId, data: nested };
  return null;
}

type DuplicateEnvelope = {
  errorCode: string | null;
  message: string;
  data: unknown;
};

/**
 * Prefer `ApiBusinessError` (2xx envelope failures). Fall back to Axios 4xx bodies —
 * create duplicates usually arrive as HTTP 400 with `error_code` + `data` on `response.data`.
 */
function getDuplicateEnvelope(error: unknown): DuplicateEnvelope | null {
  if (isApiBusinessError(error)) {
    return {
      errorCode: error.errorCode,
      message: error.message?.trim() || "",
      data: error.data,
    };
  }
  if (!axios.isAxiosError(error)) return null;
  const body = error.response?.data;
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  return {
    errorCode: typeof raw.error_code === "string" ? raw.error_code : null,
    message: typeof raw.message === "string" ? raw.message.trim() : "",
    data: raw.data,
  };
}

/**
 * Parse a create-time `DUPLICATE_ENTRY` business error into a conflict payload.
 * Returns null when the error is not a usable duplicate-with-existing-row case.
 */
export function parseDuplicateEntryConflict(error: unknown): DuplicateEntryConflict | null {
  const envelope = getDuplicateEnvelope(error);
  if (!envelope) return null;
  if ((envelope.errorCode ?? "").trim().toUpperCase() !== DUPLICATE_ENTRY_ERROR_CODE) return null;

  const existing =
    readExistingSnapshot(envelope.data) ?? readExistingSnapshot(getRawApiErrors(error));
  if (!existing) return null;

  const fieldMap = getApiFieldErrorMap(error);
  const fieldKeys = Object.keys(fieldMap).filter(
    (k) => k !== "non_field_errors" && k !== "detail" && k !== "__all__" && k !== "existing_data",
  );

  return {
    existingId: existing.id,
    fieldKeys,
    message: envelope.message || fieldMap[fieldKeys[0] ?? ""] || "Duplicate entry",
    data: existing.data,
  };
}
