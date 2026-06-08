import { MATERIAL_STATUS_USE_MOCK } from "./material-status.mock.config";

export function resolveMaterialStatusRequestUrl(path: string): string {
  const normalized = path.replace(/^\//, "");
  if (!MATERIAL_STATUS_USE_MOCK) return path;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1/${normalized}`;
  }
  return `/api/v1/${normalized}`;
}
