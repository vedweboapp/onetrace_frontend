import axios, { AxiosHeaders } from "axios";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { resolvePublicApiBaseUrl } from "@/core/config/api-url.util";

/**
 * Same-origin mock preview client. Requests appear in DevTools → Network so
 * payload + intended backend path can be copied. Data still lives in localStorage.
 */
const mockPreviewClient = axios.create({
  baseURL: "/api/mock/v1",
  headers: {
    Accept: "application/json",
  },
});

mockPreviewClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;

  // Crucial: for FormData (multipart payloads), remove Content-Type header so
  // browser XMLHttpRequest/fetch generates 'multipart/form-data; boundary=----WebKitFormBoundary...'
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.delete("Content-Type");
    } else if (config.headers && typeof config.headers === "object") {
      delete (config.headers as Record<string, unknown>)["Content-Type"];
    }
    // Prevent axios from JSON-stringifying the FormData instance
    config.transformRequest = [(data) => data];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  if (typeof config.url === "string" && config.url.length > 0) {
    const [pathOnly, qs] = config.url.split("?");
    if (pathOnly && !pathOnly.endsWith("/")) {
      config.url = qs ? `${pathOnly}/?${qs}` : `${pathOnly}/`;
    }
  }

  config.headers["X-OneTrace-Target-Base"] = resolvePublicApiBaseUrl();
  return config;
});

export type MockApiNetworkRequest = {
  method: "get" | "post" | "patch" | "put" | "delete";
  path: string;
  params?: Record<string, string | number | boolean | undefined | null>;
  data?: unknown;
};

/** Fire a visible HTTP request with the real endpoint path + payload. Never fails the mock flow. */
export async function emitMockApiNetworkRequest(input: MockApiNetworkRequest): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const params: Record<string, string | number | boolean> = {};
    if (input.params) {
      for (const [key, value] of Object.entries(input.params)) {
        if (value == null || value === "") continue;
        params[key] = value;
      }
    }

    const isFormData = typeof FormData !== "undefined" && input.data instanceof FormData;

    await mockPreviewClient.request({
      method: input.method,
      url: input.path.replace(/^\/+/, ""),
      params: Object.keys(params).length > 0 ? params : undefined,
      data: input.data,
      headers: isFormData ? { "Content-Type": undefined } : undefined,
      transformRequest: isFormData ? [(data) => data] : undefined,
    });
  } catch {
    // Preview only — local mock storage remains the source of truth.
  }
}
