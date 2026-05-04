import axios from "axios";
import { isApiBusinessError } from "./api-business-error";

export type ApiFailurePayload = {
  errorCode: string | null;
  message: string | null;
};

type Resolver = (payload: ApiFailurePayload) => string;

let resolver: Resolver | null = null;

export function setApiErrorTextResolver(next: Resolver | null) {
  resolver = next;
}

export function parseApiFailurePayload(error: unknown): ApiFailurePayload {
  if (isApiBusinessError(error)) {
    return {
      errorCode: error.errorCode,
      message: error.message,
    };
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      return {
        errorCode: typeof o.error_code === "string" ? o.error_code : null,
        message: typeof o.message === "string" ? o.message : null,
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
    return resolver(payload);
  }
  if (payload.message?.trim()) return payload.message.trim();
  return "Request failed";
}
