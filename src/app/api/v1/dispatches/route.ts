import { fetchDispatchesPageMock } from "@/features/dispatches/api/dispatch.mock";
import {
  dispatchMockJsonError,
  dispatchMockJsonSuccess,
  dispatchMockRoutesEnabled,
  proxyDispatchToBackend,
} from "@/features/dispatches/api/dispatch.mock-route.util";

export async function GET(request: Request) {
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, "dispatches/");
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(url.searchParams.get("page_size") ?? "20", 10) || 20);
  const materialRequestIdRaw = url.searchParams.get("material_request_id");
  const materialRequestId = materialRequestIdRaw ? Number.parseInt(materialRequestIdRaw, 10) : undefined;

  const { items, pagination } = await fetchDispatchesPageMock(page, pageSize, {
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    worker_name: url.searchParams.get("worker_name") ?? undefined,
    material_request_id: Number.isFinite(materialRequestId) ? materialRequestId : undefined,
  });

  return dispatchMockJsonSuccess("Data fetched successfully", items, { pagination });
}

export async function POST() {
  return dispatchMockJsonError("Create dispatch via material request dispatch endpoint", 405);
}
