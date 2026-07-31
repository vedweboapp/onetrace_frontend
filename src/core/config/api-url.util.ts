const DEFAULT_PUBLIC_API_URL = "http://110.225.254.51:5050/api/v1";

function normalizePublicApiBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  if (!trimmed) return DEFAULT_PUBLIC_API_URL;

  // Misconfigured local env often points at the Next.js app root instead of /api/v1.
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1):\d+$/i.test(trimmed)) {
    return "/api/v1";
  }
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/api\/v1$/i.test(trimmed)) {
    return "/api/v1";
  }

  return trimmed;
}

/** Client-visible API base (from NEXT_PUBLIC_API_URL). */
export function resolvePublicApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return normalizePublicApiBaseUrl(fromEnv);
  if (typeof window !== "undefined") return "/api/v1";
  return DEFAULT_PUBLIC_API_URL;
}

/** Backend origin derived from NEXT_PUBLIC_API_URL. */
export function resolveBackendOrigin(): string {
  const base = resolvePublicApiBaseUrl();
  if (base.startsWith("/")) {
    return (
      process.env.BACKEND_API_ORIGIN?.trim().replace(/\/$/, "") ?? "http://110.225.254.51:5050"
    );
  }
  try {
    return new URL(base).origin;
  } catch {
    return "http://110.225.254.51:5050";
  }
}
