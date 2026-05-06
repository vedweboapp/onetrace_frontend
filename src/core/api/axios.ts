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
import { AuthRefreshEnvelope } from "@/features/auth/types/auth.types";
import { navigateToLoginIfBrowser } from "@/features/auth/utils/auth-redirect.util";

declare module "axios" {
  export interface AxiosRequestConfig {

    skipErrorToast?: boolean;
  }
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "/api/v1";
}

const baseURL = resolveApiBaseUrl();

function rejectIfEnvelopeFailed(
  response: AxiosResponse,
): AxiosResponse | Promise<never> {
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
  /** Default JSON Content-Type would serialize FormData as JSON (`File` → `{}`). Drop it so the boundary is set. */
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
