import {
  deleteVendorTypeMock,
  fetchVendorTypeMock,
  updateVendorTypeMock,
} from "@/features/vendor-types/api/vendor-type.mock";
import {
  mockJsonError,
  mockJsonSuccess,
  proxyVendorTypeToBackend,
  vendorTypeMockRoutesEnabled,
} from "@/features/vendor-types/api/vendor-type.mock-route.util";
import type { VendorTypeUpdatePayload } from "@/features/vendor-types/types/vendor-type.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!vendorTypeMockRoutesEnabled()) {
    return proxyVendorTypeToBackend(request, `vendor-type/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid id", 404);
  const row = fetchVendorTypeMock(id);
  if (!row) return mockJsonError("Vendor type not found", 404);
  return mockJsonSuccess("Data fetched successfully", row);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!vendorTypeMockRoutesEnabled()) {
    return proxyVendorTypeToBackend(request, `vendor-type/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid id", 404);

  let body: VendorTypeUpdatePayload;
  try {
    body = (await request.json()) as VendorTypeUpdatePayload;
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  const row = updateVendorTypeMock(id, body);
  if (!row) return mockJsonError("Vendor type not found", 404);
  return mockJsonSuccess("Vendor type updated successfully", row);
}

export async function PUT(request: Request, context: RouteContext) {
  return PATCH(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!vendorTypeMockRoutesEnabled()) {
    return proxyVendorTypeToBackend(request, `vendor-type/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid id", 404);
  if (!deleteVendorTypeMock(id)) return mockJsonError("Vendor type not found", 404);
  return mockJsonSuccess("Vendor type deleted successfully", null);
}
