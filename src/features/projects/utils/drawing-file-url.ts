import { resolveBackendOrigin } from "@/core/config/api-url.util";

export function resolveDrawingFileUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("blob:") || pathOrUrl.startsWith("data:")) return pathOrUrl;

  const configuredOrigin = resolveBackendOrigin().replace(/\/$/, "");

  // If the URL is already absolute (http/https), swap its origin with the
  // configured backend origin. This prevents broken image loads when the IP
  // stored in the DB differs from the IP the frontend is currently talking to
  // (common on local networks where the server IP can change between sessions).
  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      const parsed = new URL(pathOrUrl);
      // Keep only path + search + hash, attach the current backend origin
      return `${configuredOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      // Malformed absolute URL – fall through to path-only handling
    }
  }

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${configuredOrigin}${path}`;
}
