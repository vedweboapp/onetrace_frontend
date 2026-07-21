const DEFAULT_PUBLIC_API_URL = "http://110.225.254.51:5050/api/v1";

/** Client-visible API base (from NEXT_PUBLIC_API_URL). */
export function resolvePublicApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_PUBLIC_API_URL;
}

/** Backend origin derived from NEXT_PUBLIC_API_URL (for server-side mock route proxies). */
export function resolveBackendOrigin(): string {
  try {
    return new URL(resolvePublicApiBaseUrl()).origin;
  } catch {
    return "http://110.225.254.51:5050";
  }
}
