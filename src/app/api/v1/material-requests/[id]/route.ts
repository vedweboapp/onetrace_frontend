import {
  fetchMaterialRequestMock,
  updateMaterialRequestMock,
} from "@/features/material-requests/api/material-request.mock";
import {
  materialRequestMockRoutesEnabled,
  mockJsonError,
  mockJsonSuccess,
  proxyMaterialRequestToBackend,
} from "@/features/material-requests/api/material-request.mock-route.util";
import type { MaterialRequestUpdatePayload } from "@/features/material-requests/types/material-request.types";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!materialRequestMockRoutesEnabled()) {
    return proxyMaterialRequestToBackend(request, `material-requests/${rawId}/`);
  }

  const id = parseId(rawId);
  if (id == null) return mockJsonError("Invalid material request id", 404);

  const detail = await fetchMaterialRequestMock(id);
  if (!detail) return mockJsonError("Material request not found", 404);

  return mockJsonSuccess("Data fetched successfully", detail);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!materialRequestMockRoutesEnabled()) {
    return proxyMaterialRequestToBackend(request, `material-requests/${rawId}/`);
  }

  const id = parseId(rawId);
  if (id == null) return mockJsonError("Invalid material request id", 404);

  let body: MaterialRequestUpdatePayload;
  try {
    body = (await request.json()) as MaterialRequestUpdatePayload;
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  try {
    const authHeader = request.headers.get("Authorization");
    const detail = await updateMaterialRequestMock(id, body, authHeader);
    return mockJsonSuccess("Material request updated successfully", detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return mockJsonError(message, 404);
  }
}
