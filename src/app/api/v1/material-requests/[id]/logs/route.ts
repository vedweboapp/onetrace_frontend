import { fetchMaterialRequestLogsMock } from "@/features/material-requests/api/material-request.mock";
import {
  materialRequestMockRoutesEnabled,
  mockJsonError,
  mockJsonSuccess,
  proxyMaterialRequestToBackend,
} from "@/features/material-requests/api/material-request.mock-route.util";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!materialRequestMockRoutesEnabled()) {
    return proxyMaterialRequestToBackend(request, `material-requests/${rawId}/logs/`);
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return mockJsonError("Invalid material request id", 404);

  const logs = await fetchMaterialRequestLogsMock(id);
  return mockJsonSuccess("Logs fetched successfully", logs);
}
