import {
  createMaterialStatusMock,
  fetchMaterialStatusesPageMock,
} from "@/features/material-status/api/material-status.mock";
import {
  materialStatusMockJsonError,
  materialStatusMockJsonSuccess,
  materialStatusMockRoutesEnabled,
  proxyMaterialStatusToBackend,
} from "@/features/material-status/api/material-status.mock-route.util";
import type { WorkflowColourStatusCreatePayload } from "@/shared/types/workflow-colour-status.types";

function parseListFilters(searchParams: URLSearchParams) {
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(searchParams.get("page_size") ?? "20", 10);
  const isActiveRaw = searchParams.get("is_active");
  let is_active: boolean | undefined;
  if (isActiveRaw === "True" || isActiveRaw === "true") is_active = true;
  if (isActiveRaw === "False" || isActiveRaw === "false") is_active = false;
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20,
    search: searchParams.get("search") ?? undefined,
    is_active,
  };
}

export async function GET(request: Request) {
  if (!materialStatusMockRoutesEnabled()) {
    return proxyMaterialStatusToBackend(request, "material-status/");
  }

  const filters = parseListFilters(new URL(request.url).searchParams);
  const { items, pagination } = await fetchMaterialStatusesPageMock(filters.page, filters.pageSize, filters);
  return materialStatusMockJsonSuccess("Data fetched successfully", items, { pagination });
}

export async function POST(request: Request) {
  if (!materialStatusMockRoutesEnabled()) {
    return proxyMaterialStatusToBackend(request, "material-status/");
  }

  let body: WorkflowColourStatusCreatePayload;
  try {
    body = (await request.json()) as WorkflowColourStatusCreatePayload;
  } catch {
    return materialStatusMockJsonError("Invalid JSON body");
  }

  if (!body.status_name?.trim()) return materialStatusMockJsonError("status_name is required");
  if (!body.bg_colour?.trim()) return materialStatusMockJsonError("bg_colour is required");
  if (!body.text_colour?.trim()) return materialStatusMockJsonError("text_colour is required");

  const data = await createMaterialStatusMock(body);
  return materialStatusMockJsonSuccess("MaterialStatus created successfully", data);
}
