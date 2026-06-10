import { VENDOR_USE_MOCK } from "./vendor.mock.config";

export function resolveVendorRequestUrl(path: string): string {
  const normalized = path.replace(/^\//, "");
  if (!VENDOR_USE_MOCK) return path;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1/${normalized}`;
  }
  return `/api/v1/${normalized}`;
}
