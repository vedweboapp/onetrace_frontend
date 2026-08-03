import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { toastError } from "@/shared/feedback/app-toast";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { AUTH_API_PATHS } from "@/features/auth/api/auth.paths";
import { assertApiSuccess } from "@/core/types/api.types";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import {
  parseApiFailurePayload,
  resolveApiErrorUserText,
} from "@/core/errors/api-error-text";
import { markApiErrorToasted } from "@/core/errors/api-error-toast.util";
import {
  getRawApiErrors,
  isFieldKeyedApiErrors,
} from "@/core/errors/api-field-errors.util";
import { AuthRefreshEnvelope } from "@/features/auth/types/auth.types";
import { navigateToLoginIfBrowser } from "@/features/auth/utils/auth-redirect.util";
import { resolvePublicApiBaseUrl } from "@/core/config/api-url.util";

declare module "axios" {
  export interface AxiosRequestConfig {

    skipErrorToast?: boolean;
  }
}

function resolveApiBaseUrl(): string {
  return resolvePublicApiBaseUrl();
}

function ensureTrailingSlashUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;

  // Do not append trailing slash to files with extensions (e.g. .pdf, .png, .jpg, .svg)
  const pathWithoutQuery = trimmed.split("?")[0].split("#")[0];
  const lastSegment = pathWithoutQuery.split("/").pop() || "";
  if (lastSegment.includes(".") && !lastSegment.endsWith(".")) {
    return trimmed;
  }

  // Absolute URLs — mutate pathname only.
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (!parsed.pathname.endsWith("/")) {
        parsed.pathname = `${parsed.pathname}/`;
      }
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  // Relative to axios baseURL (e.g. "clients/26" or "/api/v1/clients/26").
  // Do NOT resolve with `new URL(rel, origin)` — that turns "clients/26" into "/clients/26"
  // and bypasses baseURL, hitting Next.js page routes instead of the API proxy.
  const hashIndex = trimmed.indexOf("#");
  const queryIndex = trimmed.indexOf("?");
  let pathEnd = trimmed.length;
  if (hashIndex >= 0) pathEnd = Math.min(pathEnd, hashIndex);
  if (queryIndex >= 0) pathEnd = Math.min(pathEnd, queryIndex);
  const path = trimmed.slice(0, pathEnd);
  const suffix = trimmed.slice(pathEnd);
  if (!path || path.endsWith("/")) return trimmed;
  return `${path}/${suffix}`;
}

const baseURL = resolveApiBaseUrl();

function rejectIfEnvelopeFailed(
  response: AxiosResponse,
): AxiosResponse | Promise<never> {
  if (
    response.config.responseType === "blob" ||
    response.config.responseType === "arraybuffer"
  ) {
    return response;
  }
  const d = response.data;
  if (
    d &&
    typeof d === "object" &&
    "success" in d &&
    (d as { success: unknown }).success === false
  ) {
    const raw = d as unknown as {
      message?: unknown;
      error_code?: unknown;
      errors?: unknown;
    };
    const msg =
      typeof raw.message === "string" ? raw.message : "Request failed";
    const code =
      typeof raw.error_code === "string" ? raw.error_code : null;
    return Promise.reject(
      new ApiBusinessError(msg, { errorCode: code, errors: raw.errors }),
    );
  }
  return response;
}

function attachJsonEnvelopeGuard(client: AxiosInstance) {
  client.interceptors.response.use((response) => rejectIfEnvelopeFailed(response));
}


const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

refreshClient.interceptors.request.use((config) => {
  delete config.headers.Authorization;
  if (typeof config.url === "string" && config.url.length > 0) {
    config.url = ensureTrailingSlashUrl(config.url);
  }
  return config;
});

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof config.url === "string" && config.url.length > 0) {
    config.url = ensureTrailingSlashUrl(config.url);
  }
  return config;
});

attachJsonEnvelopeGuard(api);
attachJsonEnvelopeGuard(refreshClient);

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }
    const cfg = axios.isAxiosError(error)
      ? (error.config as InternalAxiosRequestConfig | undefined)
      : undefined;
    if (shouldSuppressApiErrorToast(error, cfg)) {
      return Promise.reject(error);
    }
    const payload = parseApiFailurePayload(error);
    toastError(resolveApiErrorUserText(payload));
    markApiErrorToasted(error);
    return Promise.reject(error);
  },
);

let refreshChain: Promise<string | null> | null = null;

async function fetchNewAccessToken(): Promise<string | null> {
  try {
    const { data } = await refreshClient.post<AuthRefreshEnvelope>(
      AUTH_API_PATHS.tokenRefresh,
      {},
    );
    assertApiSuccess(data);
    const token = data.data?.access ?? null;
    if (token) {
      useAuthStore.getState().setAccessToken(token);
    }
    return token;
  } catch {
    return null;
  }
}

function queueRefresh(): Promise<string | null> {
  if (!refreshChain) {
    refreshChain = fetchNewAccessToken().finally(() => {
      refreshChain = null;
    });
  }
  return refreshChain;
}

function isAuthNoRetryUrl(url: string) {
  return (
    url.includes(AUTH_API_PATHS.login) ||
    url.includes(AUTH_API_PATHS.tokenRefresh) ||
    url.includes(AUTH_API_PATHS.logout)
  );
}

function shouldSuppressApiErrorToast(
  error: unknown,
  config?: InternalAxiosRequestConfig,
): boolean {
  if (config?.skipErrorToast) return true;
  // Field-level validation errors are shown under form fields — skip global toast.
  if (isFieldKeyedApiErrors(getRawApiErrors(error))) return true;
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status !== 401) return false;
  const original = error.config as InternalAxiosRequestConfig & {
    _retry?: boolean;
  };
  if (!original?._retry) {
    const url = original.url ?? "";
    if (!isAuthNoRetryUrl(url)) {
      return true;
    }
  }
  return false;
}

api.interceptors.request.use((config) => {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    const headers = config.headers;
    if (headers instanceof AxiosHeaders) {
      headers.delete("Content-Type");
    } else if (headers && typeof headers === "object") {
      delete (headers as Record<string, unknown>)["Content-Type"];
    }
  }

  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  const method = (config.method ?? "get").toLowerCase();
  if (method === "get" && config.skipErrorToast === undefined) {
    config.skipErrorToast = true;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const url = original.url ?? "";
    if (isAuthNoRetryUrl(url)) {
      useAuthStore.getState().clearAuth();
      navigateToLoginIfBrowser();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const newToken = await queueRefresh();
      if (!newToken) {
        useAuthStore.getState().clearAuth();
        navigateToLoginIfBrowser();
        return Promise.reject(error);
      }
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      useAuthStore.getState().clearAuth();
      navigateToLoginIfBrowser();
      return Promise.reject(error);
    }
  },
);

export default api;
