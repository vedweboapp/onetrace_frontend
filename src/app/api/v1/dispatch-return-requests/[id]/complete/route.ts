import { completeDispatchReturnRequestMock } from "@/features/dispatches/api/dispatch.mock";
import {
  dispatchMockJsonError,
  dispatchMockJsonSuccess,
  dispatchMockRoutesEnabled,
  proxyDispatchToBackend,
} from "@/features/dispatches/api/dispatch.mock-route.util";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, `dispatch-return-requests/${rawId}/complete/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return dispatchMockJsonError("Invalid return request id", 404);

  try {
    const data = await completeDispatchReturnRequestMock(id);
    return dispatchMockJsonSuccess("Items returned to stock", data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete return request";
    return dispatchMockJsonError(message, 404);
  }
}
