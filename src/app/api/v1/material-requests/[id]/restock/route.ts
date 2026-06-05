import { restockMaterialRequestMock } from "@/features/material-requests/api/material-request.mock";
import {
  materialRequestMockRoutesEnabled,
  mockJsonError,
  mockJsonSuccess,
  proxyMaterialRequestToBackend,
} from "@/features/material-requests/api/material-request.mock-route.util";
import type { MaterialRequestRestockPayload } from "@/features/material-requests/types/material-request.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!materialRequestMockRoutesEnabled()) {
    return proxyMaterialRequestToBackend(request, `material-requests/${rawId}/restock/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid material request id", 404);

  let body: MaterialRequestRestockPayload;
  try {
    body = (await request.json()) as MaterialRequestRestockPayload;
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  try {
    const authHeader = request.headers.get("Authorization");
    const detail = await restockMaterialRequestMock(id, body, authHeader);
    return mockJsonSuccess("Items restocked successfully", detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restock failed";
    return mockJsonError(message, 404);
  }
}
