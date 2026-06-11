import {
  deletePurchaseOrderMock,
  fetchPurchaseOrderMock,
  updatePurchaseOrderMock,
} from "@/features/purchase-orders/api/purchase-order.mock";
import {
  mockJsonError,
  mockJsonSuccess,
  proxyPurchaseOrderToBackend,
  purchaseOrderMockRoutesEnabled,
} from "@/features/purchase-orders/api/purchase-order.mock-route.util";
import type { PurchaseOrderUpdatePayload } from "@/features/purchase-orders/types/purchase-order.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!purchaseOrderMockRoutesEnabled()) {
    return proxyPurchaseOrderToBackend(request, `purchase-orders/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid id", 404);
  const row = fetchPurchaseOrderMock(id);
  if (!row) return mockJsonError("Purchase order not found", 404);
  return mockJsonSuccess("Data fetched successfully", row);
}

async function handleUpdate(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!purchaseOrderMockRoutesEnabled()) {
    return proxyPurchaseOrderToBackend(request, `purchase-orders/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid id", 404);

  let body: PurchaseOrderUpdatePayload;
  try {
    body = (await request.json()) as PurchaseOrderUpdatePayload;
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  const row = updatePurchaseOrderMock(id, body);
  if (!row) return mockJsonError("Purchase order not found", 404);
  return mockJsonSuccess("Purchase Order updated successfully", row);
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleUpdate(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handleUpdate(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!purchaseOrderMockRoutesEnabled()) {
    return proxyPurchaseOrderToBackend(request, `purchase-orders/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid id", 404);
  if (!deletePurchaseOrderMock(id)) return mockJsonError("Purchase order not found", 404);
  return mockJsonSuccess("Purchase order deleted successfully", null);
}
