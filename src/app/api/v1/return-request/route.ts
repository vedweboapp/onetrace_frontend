import {
  createDispatchReturnRequestMock,
  fetchDispatchReturnRequestsMock,
} from "@/features/dispatches/api/dispatch.mock";
import {
  dispatchMockJsonError,
  dispatchMockJsonSuccess,
  dispatchMockRoutesEnabled,
  proxyDispatchToBackend,
} from "@/features/dispatches/api/dispatch.mock-route.util";
import type {
  CreateDispatchReturnRequestPayload,
  DispatchReturnRequestStatus,
  WorkerReturnDatePreset,
} from "@/features/dispatches/types/dispatch.types";

export async function GET(request: Request) {
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, "return-request/");
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as DispatchReturnRequestStatus | null;
  const workerRaw = url.searchParams.get("worker_name");
  const worker_name =
    workerRaw && Number.isFinite(Number.parseInt(workerRaw, 10))
      ? Number.parseInt(workerRaw, 10)
      : undefined;
  const search = url.searchParams.get("search")?.trim() || undefined;
  const datePreset = url.searchParams.get("date_preset") as WorkerReturnDatePreset | null;
  const date_from = url.searchParams.get("date_from")?.trim() || undefined;
  const date_to = url.searchParams.get("date_to")?.trim() || undefined;
  const mrRaw = url.searchParams.get("material_request_id");
  const material_request_id =
    mrRaw && Number.isFinite(Number.parseInt(mrRaw, 10))
      ? Number.parseInt(mrRaw, 10)
      : undefined;

  const data = await fetchDispatchReturnRequestsMock({
    status: status ?? undefined,
    worker_name,
    search,
    date_preset: datePreset ?? undefined,
    date_from,
    date_to,
    material_request_id,
  });
  return dispatchMockJsonSuccess("Return requests loaded", data);
}

export async function POST(request: Request) {
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, "return-request/");
  }

  let body: CreateDispatchReturnRequestPayload;
  try {
    body = (await request.json()) as CreateDispatchReturnRequestPayload;
  } catch {
    return dispatchMockJsonError("Invalid JSON body");
  }

  if (!Number.isFinite(body.worker_name) || body.worker_name <= 0) {
    return dispatchMockJsonError("worker_name is required");
  }
  const hasLines = Array.isArray(body.lines) && body.lines.length > 0;
  const hasGroups = Array.isArray(body.groups) && body.groups.length > 0;
  if (!hasLines && !hasGroups) {
    return dispatchMockJsonError("At least one return line or group is required");
  }

  try {
    const data = await createDispatchReturnRequestMock(body);
    return dispatchMockJsonSuccess("Return request submitted", data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create return request";
    return dispatchMockJsonError(message);
  }
}
