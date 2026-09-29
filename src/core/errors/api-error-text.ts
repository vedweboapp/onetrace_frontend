import axios from "axios";
import { isApiBusinessError } from "./api-business-error";

export type ApiFailurePayload = {
  errorCode: string | null;
  message: string | null;
  errors?: string[];
};

type Resolver = (payload: ApiFailurePayload) => string;

let resolver: Resolver | null = null;

const MAX_ERROR_LINE_LENGTH = 480;

const GENERIC_ERROR_RE =
  /^(Validation failed|Request failed|An error occurred|Bad Request|Error)$/i;

/** Detect Django/HTML debug pages and other non-JSON error dumps. */
export function isHtmlOrDebugDump(raw: string | null | undefined): boolean {
  const sample = raw?.trim().slice(0, 4096).toLowerCase() ?? "";
  if (!sample) return false;
  return (
    sample.startsWith("<!doctype") ||
    sample.startsWith("<html") ||
    sample.includes("<html") ||
    sample.includes("<body") ||
    sample.includes("<head") ||
    sample.includes("<pre") ||
    sample.includes("traceback (most recent call last)") ||
    sample.includes("exception type:") ||
    sample.includes("exception value:") ||
    sample.includes("django version") ||
    sample.includes("improperlyconfigured at /") ||
    sample.includes('id="traceback"') ||
    sample.includes('id="summary"')
  );
}

/** Keep short, human-readable API messages; drop HTML dumps and over-long blobs. */
export function sanitizeApiErrorLine(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || isHtmlOrDebugDump(trimmed)) return null;
  if (trimmed.length > MAX_ERROR_LINE_LENGTH) {
    return `${trimmed.slice(0, MAX_ERROR_LINE_LENGTH)}…`;
  }
  return trimmed;
}

export function setApiErrorTextResolver(next: Resolver | null) {
  resolver = next;
}

export function extractAllErrorMessages(data: unknown): string[] {
  if (data == null) return [];

  if (typeof data === "string") {
    const line = sanitizeApiErrorLine(data);
    return line ? [line] : [];
  }

  if (Array.isArray(data)) {
    const results: string[] = [];
    for (const item of data) {
      results.push(...extractAllErrorMessages(item));
    }
    return results;
  }

  if (typeof data === "object") {
    const results: string[] = [];
    const obj = data as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      if (key === "success" || key === "status_code" || key === "status" || key === "error_code") {
        continue;
      }

      const extracted = extractAllErrorMessages(value);
      for (const msg of extracted) {
        if (!results.includes(msg)) {
          results.push(msg);
        }
      }
    }
    return results;
  }

  return [];
}

export function normalizeApiErrorLines(errors: unknown): string[] {
  return extractAllErrorMessages(errors);
}

function defaultHttpStatusMessage(status: number | undefined): string | null {
  if (status == null || !Number.isFinite(status)) return null;
  if (status >= 500) return "The server had a problem. Please try again later.";
  if (status === 404) return "Record not found.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 401) return "Authentication required.";
  return null;
}

export function parseApiFailurePayload(error: unknown): ApiFailurePayload {
  if (isApiBusinessError(error)) {
    const extracted = extractAllErrorMessages(error.errors);
    return {
      errorCode: error.errorCode,
      message: sanitizeApiErrorLine(error.message),
      errors:
        extracted.length > 0
          ? extracted
          : extractAllErrorMessages(error.message),
    };
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const status = error.response?.status;
    const extracted = extractAllErrorMessages(data);
    const messageFromString =
      typeof data === "string" ? sanitizeApiErrorLine(data) : null;

    return {
      errorCode: status != null ? `HTTP_${status}` : "HTTP_500",
      message: messageFromString,
      errors: extracted,
    };
  }

  if (error instanceof Error) {
    const line = sanitizeApiErrorLine(error.message);
    return { errorCode: null, message: line, errors: line ? [line] : [] };
  }

  if (typeof error === "string") {
    const line = sanitizeApiErrorLine(error);
    return { errorCode: null, message: line, errors: line ? [line] : [] };
  }

  if (error && typeof error === "object") {
    const extracted = extractAllErrorMessages(error);
    if (extracted.length > 0) {
      return { errorCode: null, message: null, errors: extracted };
    }
  }

  return { errorCode: null, message: null, errors: [] };
}

export function resolveApiErrorUserText(payload: ApiFailurePayload): string {
  if (resolver) {
    const custom = resolver(payload);
    if (custom?.trim()) return custom.trim();
  }

  const errs = (payload.errors ?? [])
    .map((e) => sanitizeApiErrorLine(e))
    .filter((e): e is string => Boolean(e));

  const specificErrors = errs.filter((e) => !GENERIC_ERROR_RE.test(e));

  if (specificErrors.length > 0) {
    return specificErrors.join("\n");
  }

  if (errs.length > 0) {
    return errs.join("\n");
  }

  const cleanMessage = sanitizeApiErrorLine(payload.message);
  if (cleanMessage && !GENERIC_ERROR_RE.test(cleanMessage)) {
    return cleanMessage;
  }

  const statusMatch = payload.errorCode?.match(/^HTTP_(\d+)$/);
  const fromStatus = defaultHttpStatusMessage(
    statusMatch ? Number.parseInt(statusMatch[1], 10) : undefined,
  );
  if (fromStatus) return fromStatus;

  return "Request failed";
}
