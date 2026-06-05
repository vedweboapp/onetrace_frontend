import { MATERIAL_REQUEST_USE_MOCK } from "./material-request.mock.config";

/**
 * When mock is on, material-request calls must hit Next.js route handlers on the
 * dev server (`/api/v1/material-requests/...`), not the remote backend from
 * NEXT_PUBLIC_API_URL. Absolute same-origin URLs bypass axios baseURL.
 */
export function resolveMaterialRequestRequestUrl(path: string): string {
  const normalized = path.replace(/^\//, "");
  if (!MATERIAL_REQUEST_USE_MOCK) return path;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1/${normalized}`;
  }
  return `/api/v1/${normalized}`;
}
