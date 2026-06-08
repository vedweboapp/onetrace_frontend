import {
  deleteMaterialStatusMock,
  fetchMaterialStatusMock,
  updateMaterialStatusMock,
} from "@/features/material-status/api/material-status.mock";
import {
  materialStatusMockJsonError,
  materialStatusMockJsonSuccess,
  materialStatusMockRoutesEnabled,
  proxyMaterialStatusToBackend,
} from "@/features/material-status/api/material-status.mock-route.util";
import type { WorkflowColourStatusUpdatePayload } from "@/shared/types/workflow-colour-status.types";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!materialStatusMockRoutesEnabled()) {
    return proxyMaterialStatusToBackend(request, `material-status/${rawId}/`);
  }

  const id = parseId(rawId);
  if (id == null) return materialStatusMockJsonError("Invalid material status id", 404);

  const data = await fetchMaterialStatusMock(id);
  if (!data) return materialStatusMockJsonError("MaterialStatus not found", 404);
  return materialStatusMockJsonSuccess("MaterialStatus fetched successfully", data);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!materialStatusMockRoutesEnabled()) {
    return proxyMaterialStatusToBackend(request, `material-status/${rawId}/`);
  }

  const id = parseId(rawId);
  if (id == null) return materialStatusMockJsonError("Invalid material status id", 404);

  let body: WorkflowColourStatusUpdatePayload;
  try {
    body = (await request.json()) as WorkflowColourStatusUpdatePayload;
  } catch {
    return materialStatusMockJsonError("Invalid JSON body");
  }

  try {
    const data = await updateMaterialStatusMock(id, body);
    return materialStatusMockJsonSuccess("MaterialStatus updated successfully", data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update material status";
    return materialStatusMockJsonError(message, 404);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  return PATCH(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  if (!materialStatusMockRoutesEnabled()) {
    return proxyMaterialStatusToBackend(request, `material-status/${rawId}/`);
  }

  const id = parseId(rawId);
  if (id == null) return materialStatusMockJsonError("Invalid material status id", 404);

  try {
    await deleteMaterialStatusMock(id);
    return materialStatusMockJsonSuccess("MaterialStatus deleted successfully", null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete material status";
    return materialStatusMockJsonError(message, 404);
  }
}
