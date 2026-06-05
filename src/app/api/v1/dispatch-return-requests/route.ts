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
} from "@/features/dispatches/types/dispatch.types";

export async function GET(request: Request) {
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, "dispatch-return-requests/");
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as DispatchReturnRequestStatus | null;
  const workerRaw = url.searchParams.get("worker_name");
  const worker_name =
    workerRaw && Number.isFinite(Number.parseInt(workerRaw, 10))
      ? Number.parseInt(workerRaw, 10)
      : undefined;

  const data = await fetchDispatchReturnRequestsMock({
    status: status ?? undefined,
    worker_name,
  });
  return dispatchMockJsonSuccess("Return requests loaded", data);
}

export async function POST(request: Request) {
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, "dispatch-return-requests/");
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
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return dispatchMockJsonError("At least one return line is required");
  }

  try {
    const data = await createDispatchReturnRequestMock(body);
    return dispatchMockJsonSuccess("Return request submitted", data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create return request";
    return dispatchMockJsonError(message);
  }
}
