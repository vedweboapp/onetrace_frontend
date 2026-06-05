import { restockDispatchMock } from "@/features/dispatches/api/dispatch.mock";
import {
  dispatchMockJsonError,
  dispatchMockJsonSuccess,
  dispatchMockRoutesEnabled,
  proxyDispatchToBackend,
} from "@/features/dispatches/api/dispatch.mock-route.util";
import type { DispatchRestockPayload } from "@/features/dispatches/types/dispatch.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, `dispatches/${rawId}/restock/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return dispatchMockJsonError("Invalid dispatch id", 404);

  let body: DispatchRestockPayload;
  try {
    body = (await request.json()) as DispatchRestockPayload;
  } catch {
    return dispatchMockJsonError("Invalid JSON body");
  }

  try {
    const detail = await restockDispatchMock(id, body);
    return dispatchMockJsonSuccess("Items restocked successfully", detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restock failed";
    return dispatchMockJsonError(message, 404);
  }
}
