/**
 * Turns API file paths (e.g. `/media/drawings/x.pdf`) into a browser-openable URL.
 * Absolute `http(s)` values are returned unchanged.
 */
export function resolveDrawingFileUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  const envBase = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
  if (envBase.startsWith("http")) {
    const origin = envBase.replace(/\/api\/v1\/?$/i, "");
    return `${origin || envBase}${path}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }

  return path;
}
