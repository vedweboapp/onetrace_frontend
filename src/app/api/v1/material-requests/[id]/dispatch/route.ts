import { dispatchMaterialRequestMock } from "@/features/material-requests/api/material-request.mock";
import {
  materialRequestMockRoutesEnabled,
  mockJsonError,
  mockJsonSuccess,
  proxyMaterialRequestToBackend,
} from "@/features/material-requests/api/material-request.mock-route.util";
import type { MaterialRequestDispatchPayload } from "@/features/material-requests/types/material-request-dispatch.types";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function POST(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!materialRequestMockRoutesEnabled()) {
    return proxyMaterialRequestToBackend(request, `material-requests/${rawId}/dispatch`);
  }

  const id = parseId(rawId);
  if (id == null) return mockJsonError("Invalid material request id", 404);

  let body: MaterialRequestDispatchPayload;
  try {
    body = (await request.json()) as MaterialRequestDispatchPayload;
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  try {
    const authHeader = request.headers.get("Authorization");
    const detail = await dispatchMaterialRequestMock(id, body, authHeader);
    return mockJsonSuccess("Dispatch recorded successfully", detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed";
    return mockJsonError(message, 404);
  }
}
