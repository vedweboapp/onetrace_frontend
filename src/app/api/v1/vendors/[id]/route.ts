import { deleteVendorMock, fetchVendorMock, updateVendorMock } from "@/features/vendors/api/vendor.mock";
import {
  mockJsonError,
  mockJsonSuccess,
  proxyVendorToBackend,
  vendorMockRoutesEnabled,
} from "@/features/vendors/api/vendor.mock-route.util";
import type { VendorUpdatePayload } from "@/features/vendors/types/vendor.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!vendorMockRoutesEnabled()) {
    return proxyVendorToBackend(request, `vendors/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid id", 404);
  const row = fetchVendorMock(id);
  if (!row) return mockJsonError("Vendor not found", 404);
  return mockJsonSuccess("Data fetched successfully", row);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!vendorMockRoutesEnabled()) {
    return proxyVendorToBackend(request, `vendors/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid id", 404);

  let body: VendorUpdatePayload;
  try {
    body = (await request.json()) as VendorUpdatePayload;
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  const row = updateVendorMock(id, body);
  if (!row) return mockJsonError("Vendor not found", 404);
  return mockJsonSuccess("Vendor updated successfully", row);
}

export async function PUT(request: Request, context: RouteContext) {
  return PATCH(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!vendorMockRoutesEnabled()) {
    return proxyVendorToBackend(request, `vendors/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid id", 404);
  if (!deleteVendorMock(id)) return mockJsonError("Vendor not found", 404);
  return mockJsonSuccess("Vendor deleted successfully", null);
}
