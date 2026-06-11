import { VENDOR_TYPE_USE_MOCK } from "./vendor-type.mock.config";

export function resolveVendorTypeRequestUrl(path: string): string {
  const normalized = path.replace(/^\//, "");
  if (!VENDOR_TYPE_USE_MOCK) return path;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1/${normalized}`;
  }
  return `/api/v1/${normalized}`;
}
