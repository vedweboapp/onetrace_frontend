import { fetchWorkerReturnMaterialsMock } from "@/features/dispatches/api/dispatch.mock";
import {
  dispatchMockJsonError,
  dispatchMockJsonSuccess,
  dispatchMockRoutesEnabled,
  proxyDispatchToBackend,
} from "@/features/dispatches/api/dispatch.mock-route.util";
import type { WorkerReturnDatePreset, WorkerReturnMaterialsFilters } from "@/features/dispatches/types/dispatch.types";

export async function GET(request: Request) {
  if (!dispatchMockRoutesEnabled()) {
    return proxyDispatchToBackend(request, "dispatches/worker-return-materials/");
  }

  const url = new URL(request.url);
  const workerRaw = url.searchParams.get("worker_name");
  const worker_name = Number.parseInt(workerRaw ?? "", 10);
  if (!Number.isFinite(worker_name) || worker_name <= 0) {
    return dispatchMockJsonError("worker_name is required");
  }

  const datePreset = (url.searchParams.get("date_preset") ?? "till_today") as WorkerReturnDatePreset;
  const dispatchRaw = url.searchParams.get("dispatch_id");
  const mrRaw = url.searchParams.get("material_request_id");

  const filters: WorkerReturnMaterialsFilters = {
    worker_name,
    date_preset: datePreset,
    date_from: url.searchParams.get("date_from") ?? undefined,
    date_to: url.searchParams.get("date_to") ?? undefined,
    dispatch_id:
      dispatchRaw && Number.isFinite(Number.parseInt(dispatchRaw, 10))
        ? Number.parseInt(dispatchRaw, 10)
        : undefined,
    material_request_id:
      mrRaw && Number.isFinite(Number.parseInt(mrRaw, 10))
        ? Number.parseInt(mrRaw, 10)
        : undefined,
  };

  const data = await fetchWorkerReturnMaterialsMock(filters);
  return dispatchMockJsonSuccess("Worker return materials loaded", data);
}
