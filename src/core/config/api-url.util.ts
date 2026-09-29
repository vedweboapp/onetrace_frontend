const DEFAULT_PUBLIC_API_URL = "http://110.225.254.51:5050/api/v1";
const DEFAULT_BACKEND_ORIGIN = "http://110.225.254.51:5050";

function normalizePublicApiBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  if (!trimmed) return DEFAULT_PUBLIC_API_URL;

  // Misconfigured: points at Next.js app root instead of the backend.
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1):\d+$/i.test(trimmed)) {
    return DEFAULT_PUBLIC_API_URL;
  }

  return trimmed;
}

function resolveBackendOriginFromEnv(): string {
  return process.env.BACKEND_API_ORIGIN?.trim().replace(/\/$/, "") ?? DEFAULT_BACKEND_ORIGIN;
}

/** API base URL — reads NEXT_PUBLIC_API_URL from .env.local (direct backend IP for local dev). */
export function resolvePublicApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (fromEnv) {
    const normalized = normalizePublicApiBaseUrl(fromEnv);

    // Optional same-origin proxy (/api/v1) — server-side resolves to backend origin.
    if (normalized.startsWith("/")) {
      if (typeof window !== "undefined") return normalized;
      return `${resolveBackendOriginFromEnv()}${normalized}`;
    }

    return normalized;
  }

  return DEFAULT_PUBLIC_API_URL;
}

/** Backend origin for media / file URLs. */
export function resolveBackendOrigin(): string {
  const base = resolvePublicApiBaseUrl();
  if (base.startsWith("/")) {
    return resolveBackendOriginFromEnv();
  }
  try {
    return new URL(base).origin;
  } catch {
    return DEFAULT_BACKEND_ORIGIN;
  }
}
