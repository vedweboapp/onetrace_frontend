import {
  createMaterialRequestMock,
  fetchMaterialRequestsPageMock,
} from "@/features/material-requests/api/material-request.mock";
import { parseMaterialRequestListFilters } from "@/features/material-requests/api/material-request.mock-backend.util";
import {
  materialRequestMockRoutesEnabled,
  mockJsonError,
  mockJsonSuccess,
  proxyMaterialRequestToBackend,
} from "@/features/material-requests/api/material-request.mock-route.util";
import type { MaterialRequestCreatePayload } from "@/features/material-requests/types/material-request.types";

export async function GET(request: Request) {
  if (!materialRequestMockRoutesEnabled()) {
    return proxyMaterialRequestToBackend(request, "material-requests/");
  }

  const { page, pageSize, ...filters } = parseMaterialRequestListFilters(new URL(request.url).searchParams);
  const { items, pagination } = await fetchMaterialRequestsPageMock(page, pageSize, {
    ...filters,
    page,
    pageSize,
  });

  return mockJsonSuccess("Data fetched successfully", items, { pagination });
}

export async function POST(request: Request) {
  if (!materialRequestMockRoutesEnabled()) {
    return proxyMaterialRequestToBackend(request, "material-requests/");
  }

  let body: MaterialRequestCreatePayload;
  try {
    body = (await request.json()) as MaterialRequestCreatePayload;
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  const authHeader = request.headers.get("Authorization");
  const detail = await createMaterialRequestMock(body, authHeader);
  return mockJsonSuccess("Material request created successfully", detail);
}
