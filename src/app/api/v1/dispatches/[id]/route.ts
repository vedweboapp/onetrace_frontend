import { fetchDispatchMock } from "@/features/dispatches/api/dispatch.mock";
import {
  dispatchMockJsonError,
  dispatchMockJsonSuccess,
  dispatchMockRoutesEnabled,
  proxyDispatchToBackend,
} from "@/features/dispatches/api/dispatch.mock-route.util";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, `dispatches/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return dispatchMockJsonError("Invalid dispatch id", 404);

  const detail = await fetchDispatchMock(id);
  if (!detail) return dispatchMockJsonError("Dispatch not found", 404);

  return dispatchMockJsonSuccess("Data fetched successfully", detail);
}
