import { resolveBackendOrigin } from "@/core/config/api-url.util";

export function resolveDrawingFileUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("blob:") || pathOrUrl.startsWith("data:")) return pathOrUrl;

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const origin = resolveBackendOrigin().replace(/\/$/, "");
  return `${origin}${path}`;
}
