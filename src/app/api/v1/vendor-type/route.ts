import {
  createVendorTypeMock,
  fetchVendorTypesPageMock,
} from "@/features/vendor-types/api/vendor-type.mock";
import {
  mockJsonError,
  mockJsonSuccess,
  proxyVendorTypeToBackend,
  vendorTypeMockRoutesEnabled,
} from "@/features/vendor-types/api/vendor-type.mock-route.util";
import type { VendorTypeCreatePayload } from "@/features/vendor-types/types/vendor-type.types";

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
  if (!vendorTypeMockRoutesEnabled()) {
    return proxyVendorTypeToBackend(request, "vendor-type/");
  }

  const { page, pageSize, search, is_active } = parseListFilters(new URL(request.url).searchParams);
  const { items, pagination } = fetchVendorTypesPageMock(page, pageSize, { search, is_active });
  return mockJsonSuccess("Data fetched successfully", items, { pagination });
}

export async function POST(request: Request) {
  if (!vendorTypeMockRoutesEnabled()) {
    return proxyVendorTypeToBackend(request, "vendor-type/");
  }

  let body: VendorTypeCreatePayload;
  try {
    body = (await request.json()) as VendorTypeCreatePayload;
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  if (!body.name?.trim()) return mockJsonError("Name is required");
  const row = createVendorTypeMock(body);
  return mockJsonSuccess("Vendor type created successfully", row);
}
