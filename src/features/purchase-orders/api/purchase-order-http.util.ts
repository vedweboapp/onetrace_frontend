import { PURCHASE_ORDER_USE_MOCK } from "./purchase-order.mock.config";

export function resolvePurchaseOrderRequestUrl(path: string): string {
  const normalized = path.replace(/^\//, "");
  if (!PURCHASE_ORDER_USE_MOCK) return path;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1/${normalized}`;
  }
  return `/api/v1/${normalized}`;
}
