import { DISPATCH_USE_MOCK } from "./dispatch.mock.config";

export function resolveDispatchRequestUrl(path: string): string {
  const normalized = path.replace(/^\//, "");
  if (!DISPATCH_USE_MOCK) return path;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1/${normalized}`;
  }
  return `/api/v1/${normalized}`;
}
