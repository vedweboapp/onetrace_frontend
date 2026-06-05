import { returnDispatchToStockMock } from "@/features/dispatches/api/dispatch.mock";
import {
  dispatchMockJsonError,
  dispatchMockJsonSuccess,
  dispatchMockRoutesEnabled,
  proxyDispatchToBackend,
} from "@/features/dispatches/api/dispatch.mock-route.util";
import type { DispatchReturnToStockPayload } from "@/features/dispatches/types/dispatch.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, `dispatches/${rawId}/return-to-stock/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return dispatchMockJsonError("Invalid dispatch id", 404);

  let body: DispatchReturnToStockPayload;
  try {
    body = (await request.json()) as DispatchReturnToStockPayload;
  } catch {
    return dispatchMockJsonError("Invalid JSON body");
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return dispatchMockJsonError("At least one return line is required");
  }

  try {
    const detail = await returnDispatchToStockMock(id, body);
    return dispatchMockJsonSuccess("Items returned to stock successfully", detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Return to stock failed";
    return dispatchMockJsonError(message, 404);
  }
}
