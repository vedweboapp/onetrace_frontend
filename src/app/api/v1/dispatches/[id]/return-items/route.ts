import { fetchDispatchReturnItemsMock } from "@/features/dispatches/api/dispatch.mock";
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
    return proxyDispatchToBackend(request, `dispatches/${rawId}/return-items/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return dispatchMockJsonError("Invalid dispatch id", 404);

  const data = await fetchDispatchReturnItemsMock(id);
  if (!data) return dispatchMockJsonError("Dispatch not found", 404);

  return dispatchMockJsonSuccess("Returnable items loaded", data);
}
