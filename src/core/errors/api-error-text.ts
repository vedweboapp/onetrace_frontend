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

export function extractAllErrorMessages(data: unknown): string[] {
  if (data == null) return [];

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed || trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      return [];
    }
    return [trimmed];
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

export function parseApiFailurePayload(error: unknown): ApiFailurePayload {
  if (isApiBusinessError(error)) {
    const extracted = extractAllErrorMessages(error.errors);
    return {
      errorCode: error.errorCode,
      message: error.message,
      errors: extracted.length > 0 ? extracted : extractAllErrorMessages(error.message),
    };
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const extracted = extractAllErrorMessages(data);
    
    return {
      errorCode: `HTTP_${error.response?.status ?? 500}`,
      message: typeof data === "string" && data.trim() ? data.trim() : null,
      errors: extracted,
    };
  }

  if (error instanceof Error) {
    return { errorCode: null, message: error.message, errors: [error.message] };
  }

  if (typeof error === "string" && error.trim()) {
    return { errorCode: null, message: error.trim(), errors: [error.trim()] };
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

  const errs = (payload.errors ?? []).map((e) => e.trim()).filter(Boolean);
  
  // Filter out generic phrases if specific error messages exist
  const specificErrors = errs.filter(
    (e) => !/^(Validation failed|Request failed|An error occurred|Bad Request|Error)$/i.test(e)
  );

  if (specificErrors.length > 0) {
    return specificErrors.join("\n");
  }

  if (errs.length > 0) {
    return errs.join("\n");
  }

  if (payload.message?.trim()) {
    return payload.message.trim();
  }

  return "Request failed";
}
