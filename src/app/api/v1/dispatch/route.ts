import { dispatchMaterialRequestMock } from "@/features/material-requests/api/material-request.mock";
import {
  dispatchMockJsonError,
  dispatchMockJsonSuccess,
  dispatchMockRoutesEnabled,
  proxyDispatchToBackend,
} from "@/features/dispatches/api/dispatch.mock-route.util";
import type { MaterialRequestDispatchPayload } from "@/features/material-requests/types/material-request-dispatch.types";

export async function POST(request: Request) {
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, "dispatch/");
  }

  let body: MaterialRequestDispatchPayload;
  try {
    body = (await request.json()) as MaterialRequestDispatchPayload;
  } catch {
    return dispatchMockJsonError("Invalid JSON body");
  }

  const id = Number.isFinite(body.material_request) ? Number(body.material_request) : null;
  if (id == null || id <= 0) {
    return dispatchMockJsonError("Invalid material_request id", 404);
  }

  try {
    const authHeader = request.headers.get("Authorization");
    const detail = await dispatchMaterialRequestMock(id, body, authHeader);
    return dispatchMockJsonSuccess("Dispatch recorded successfully", detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed";
    return dispatchMockJsonError(message, 404);
  }
}
