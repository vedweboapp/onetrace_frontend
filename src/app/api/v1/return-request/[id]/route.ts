import { fetchDispatchReturnRequestMock } from "@/features/dispatches/api/dispatch.mock";
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
    return proxyDispatchToBackend(request, `return-request/${rawId}/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return dispatchMockJsonError("Invalid return request id");
  }

  const data = await fetchDispatchReturnRequestMock(id);
  if (!data) return dispatchMockJsonError("Return request not found", 404);

  return dispatchMockJsonSuccess("Return request loaded", data);
}
