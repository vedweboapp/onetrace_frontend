import {
  createPurchaseOrderMock,
  fetchPurchaseOrdersPageMock,
} from "@/features/purchase-orders/api/purchase-order.mock";
import {
  mockJsonError,
  mockJsonSuccess,
  proxyPurchaseOrderToBackend,
  purchaseOrderMockRoutesEnabled,
} from "@/features/purchase-orders/api/purchase-order.mock-route.util";
import type { PurchaseOrderCreatePayload } from "@/features/purchase-orders/types/purchase-order.types";

function parseListFilters(searchParams: URLSearchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(searchParams.get("page_size") ?? "20", 10) || 20);
  const search = searchParams.get("search")?.trim() || undefined;
  const status = searchParams.get("status")?.trim() || undefined;
  const vendorRaw = searchParams.get("vendor");
  const vendor =
    vendorRaw && /^\d+$/.test(vendorRaw) ? Number.parseInt(vendorRaw, 10) : undefined;
  const issue_date = searchParams.get("issue_date")?.trim() || undefined;
  const due_date = searchParams.get("due_date")?.trim() || undefined;
  return { page, pageSize, search, status, vendor, issue_date, due_date };
}

export async function GET(request: Request) {
  if (!purchaseOrderMockRoutesEnabled()) {
    return proxyPurchaseOrderToBackend(request, "purchase-orders/");
  }

  const { page, pageSize, search, status, vendor, issue_date, due_date } = parseListFilters(
    new URL(request.url).searchParams,
  );
  const { items, pagination } = fetchPurchaseOrdersPageMock(page, pageSize, {
    search,
    status,
    vendor,
    issue_date,
    due_date,
  });
  return mockJsonSuccess("Data fetched successfully", items, { pagination });
}

export async function POST(request: Request) {
  if (!purchaseOrderMockRoutesEnabled()) {
    return proxyPurchaseOrderToBackend(request, "purchase-orders/");
  }

  let body: PurchaseOrderCreatePayload;
  try {
    body = (await request.json()) as PurchaseOrderCreatePayload;
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  if (!body.vendor || body.vendor <= 0) return mockJsonError("Vendor is required");
  if (!body.composite_items?.length) return mockJsonError("At least one line item is required");

  try {
    const row = createPurchaseOrderMock(body);
    return mockJsonSuccess("Purchase Order created successfully", row);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create purchase order";
    return mockJsonError(message);
  }
}
