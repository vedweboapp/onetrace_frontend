import { createVendorMock, fetchVendorsPageMock } from "@/features/vendors/api/vendor.mock";
import {
  mockJsonError,
  mockJsonSuccess,
  proxyVendorToBackend,
  vendorMockRoutesEnabled,
} from "@/features/vendors/api/vendor.mock-route.util";
import type { VendorCreatePayload } from "@/features/vendors/types/vendor.types";

function parseListFilters(searchParams: URLSearchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(searchParams.get("page_size") ?? "20", 10) || 20);
  const search = searchParams.get("search")?.trim() || undefined;
  const isActiveRaw = searchParams.get("is_active");
  const is_active =
    isActiveRaw === "True" || isActiveRaw === "true"
      ? true
      : isActiveRaw === "False" || isActiveRaw === "false"
        ? false
        : undefined;
  return { page, pageSize, search, is_active };
}

export async function GET(request: Request) {
  if (!vendorMockRoutesEnabled()) {
    return proxyVendorToBackend(request, "vendors/");
  }

  const { page, pageSize, search, is_active } = parseListFilters(new URL(request.url).searchParams);
  const { items, pagination } = fetchVendorsPageMock(page, pageSize, { search, is_active });
  return mockJsonSuccess("Data fetched successfully", items, { pagination });
}

export async function POST(request: Request) {
  if (!vendorMockRoutesEnabled()) {
    return proxyVendorToBackend(request, "vendors/");
  }

  let body: VendorCreatePayload;
  try {
    body = (await request.json()) as VendorCreatePayload;
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  if (!body.name?.trim()) return mockJsonError("Name is required");
  if (!body.addresses?.length) return mockJsonError("At least one address is required");
  const row = createVendorMock(body);
  return mockJsonSuccess("Vendor created successfully", row);
}
