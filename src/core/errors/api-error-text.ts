import axios from "axios";
import { isApiBusinessError } from "./api-business-error";

export type ApiFailurePayload = {
  errorCode: string | null;
  message: string | null;
  errors?: string[];
};

type Resolver = (payload: ApiFailurePayload) => string;

let resolver: Resolver | null = null;

export function setApiErrorTextResolver(next: Resolver | null) {
  resolver = next;
}

export function normalizeApiErrorLines(errors: unknown): string[] {
  if (errors == null) return [];

  if (Array.isArray(errors)) {
    return errors
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (entry && typeof entry === "object" && "message" in entry) {
          const msg = (entry as { message?: unknown }).message;
          return typeof msg === "string" ? msg.trim() : "";
        }
        return "";
      })
      .filter((line) => line.length > 0);
  }

  if (typeof errors === "object") {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string" && item.trim()) {
            lines.push(`${key}: ${item.trim()}`);
          }
        }
      } else if (typeof value === "string" && value.trim()) {
        lines.push(`${key}: ${value.trim()}`);
      }
    }
    return lines;
  }

  if (typeof errors === "string" && errors.trim()) return [errors.trim()];
  return [];
}

function buildApiErrorLines(payload: ApiFailurePayload): string[] {
  const lines: string[] = [];
  const message = payload.message?.trim();
  if (message) lines.push(message);
  for (const detail of payload.errors ?? []) {
    const line = detail.trim();
    if (line && !lines.includes(line)) lines.push(line);
  }
  return lines;
}

export function parseApiFailurePayload(error: unknown): ApiFailurePayload {
  if (isApiBusinessError(error)) {
    return {
      errorCode: error.errorCode,
      message: error.message,
      errors: normalizeApiErrorLines(error.errors),
    };
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      return {
        errorCode: typeof o.error_code === "string" ? o.error_code : null,
        message: typeof o.message === "string" ? o.message : null,
        errors: normalizeApiErrorLines(o.errors),
      };
    }
    if (!error.response) {
      return { errorCode: "NETWORK", message: null };
    }
    return {
      errorCode: `HTTP_${error.response.status}`,
      message: null,
    };
  }

  if (error instanceof Error) {
    return { errorCode: null, message: error.message };
  }

  return { errorCode: null, message: null };
}

export function resolveApiErrorUserText(payload: ApiFailurePayload): string {
  if (resolver) {
    const custom = resolver(payload);
    if (custom?.trim()) return custom.trim();
  }
  const lines = buildApiErrorLines(payload);
  if (lines.length) return lines.join("\n");
  return "Request failed";
}
