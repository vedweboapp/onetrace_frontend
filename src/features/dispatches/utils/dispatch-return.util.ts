import type {
  DispatchDetail,
  DispatchReturnItem,
  DispatchReturnItemsData,
  DispatchReturnRequest,
  WorkerReturnMaterialLine,
  WorkerReturnMaterialsData,
  WorkerReturnMaterialsFilters,
} from "@/features/dispatches/types/dispatch.types";
import type { CreateDispatchReturnRequestLineInput } from "@/features/dispatches/types/dispatch.types";
import { dispatchWorkerLabel } from "@/features/dispatches/utils/dispatch-display.util";
import {
  dispatchDateInRange,
  resolveWorkerReturnDateRange,
} from "@/features/dispatches/utils/worker-return-date.util";

import {
  aggregatedDispatchReturnLinesToApi,
  aggregateDispatchReturnLines,
  extraQuantityPool,
  extraReturnedForLine,
  extraReturnableForLine,
  isLineReturnableAsExtra,
} from "@/features/dispatches/utils/dispatch-line-aggregate.util";

export function buildDispatchReturnItems(detail: DispatchDetail): DispatchReturnItemsData {
  const lines = aggregatedDispatchReturnLinesToApi(aggregateDispatchReturnLines(detail));

  return {
    dispatch_id: detail.id,
    dispatch_number: detail.dispatch_number,
    material_request_id: detail.material_request_id,
    material_request_number: detail.material_request_number,
    worker_name: detail.worker_name,
    lines,
  };
}

export function dispatchReturnWorkerLabel(
  worker: DispatchReturnItem["worker_name"],
  fallback?: string,
): string {
  if (fallback?.trim()) return fallback.trim();
  return dispatchWorkerLabel(worker);
}

function workerIdFromRef(worker: DispatchDetail["worker_name"]): number | null {
  if (typeof worker === "number" && worker > 0) return worker;
  if (worker && typeof worker === "object" && worker.id > 0) return worker.id;
  return null;
}

function pendingQtyForLine(
  pendingRequests: DispatchReturnRequest[],
  dispatchId: number,
  lineId: number,
): number {
  let total = 0;
  for (const req of pendingRequests) {
    if (req.status !== "pending") continue;
    for (const line of req.lines) {
      if (line.dispatch_id === dispatchId && line.line_id === lineId) {
        total += line.quantity;
      }
    }
  }
  return total;
}

function aggregateGroupKey(
  itemId: number,
  isExtra: boolean,
  materialRequestId: number,
): string {
  if (isExtra) return `extra:item:${itemId}`;
  return `mr:${materialRequestId}:item:${itemId}`;
}

export function allocateReturnQuantityAcrossSources(
  line: WorkerReturnMaterialLine,
  quantity: number,
  returnType: CreateDispatchReturnRequestLineInput["return_type"],
  reason?: string,
): CreateDispatchReturnRequestLineInput[] {
  let remaining = Math.min(quantity, line.returnable_quantity);
  const out: CreateDispatchReturnRequestLineInput[] = [];

  for (const source of line.sources) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, source.returnable_quantity);
    if (take <= 0) continue;
    out.push({
      dispatch_id: source.dispatch_id,
      line_id: source.line_id,
      quantity: take,
      return_type: returnType,
      reason,
    });
    remaining -= take;
  }

  return out;
}

export function buildWorkerReturnMaterials(
  dispatches: DispatchDetail[],
  filters: WorkerReturnMaterialsFilters,
  pendingRequests: DispatchReturnRequest[] = [],
): WorkerReturnMaterialsData {
  const preset = filters.date_preset ?? "till_today";
  const { date_from, date_to } = resolveWorkerReturnDateRange(
    preset,
    filters.date_from,
    filters.date_to,
  );

  const groupMap = new Map<string, WorkerReturnMaterialLine>();

  for (const detail of dispatches) {
    const workerId = workerIdFromRef(detail.worker_name);
    if (workerId == null || workerId !== filters.worker_name) continue;
    if (filters.dispatch_id != null && detail.id !== filters.dispatch_id) continue;
    if (filters.material_request_id != null && detail.material_request_id !== filters.material_request_id) {
      continue;
    }
    if (preset !== "material_request" && !dispatchDateInRange(detail.dispatch_date, date_from, date_to)) {
      continue;
    }

    for (const line of detail.lines) {
      if (!isLineReturnableAsExtra(line)) continue;

      const pendingRequest = pendingQtyForLine(pendingRequests, detail.id, line.id);
      const available = extraReturnableForLine(line, pendingRequest);
      if (available <= 0) continue;

      const extraPool = extraQuantityPool(line);
      const extraReturned = extraReturnedForLine(line);
      const mrId = line.is_extra ? 0 : detail.material_request_id;
      const groupKey = aggregateGroupKey(line.item.id, line.is_extra, mrId);
      const existing = groupMap.get(groupKey);

      const source = {
        dispatch_id: detail.id,
        line_id: line.id,
        returnable_quantity: available,
      };

      if (existing) {
        existing.dispatched_quantity += extraPool;
        existing.returned_quantity += extraReturned;
        existing.returnable_quantity += available;
        existing.pending_request_quantity += pendingRequest;
        existing.sources.push(source);
      } else {
        groupMap.set(groupKey, {
          group_key: groupKey,
          item_id: line.item.id,
          item_name: line.item.name?.trim() || null,
          material_request_id: line.is_extra ? null : detail.material_request_id,
          material_request_number: line.is_extra ? null : detail.material_request_number,
          is_extra: line.is_extra,
          dispatched_quantity: extraPool,
          returned_quantity: extraReturned,
          returnable_quantity: available,
          pending_request_quantity: pendingRequest,
          sources: [source],
        });
      }
    }
  }

  const lines = [...groupMap.values()].sort((a, b) => {
    if (a.is_extra !== b.is_extra) return a.is_extra ? 1 : -1;
    const mrA = a.material_request_number ?? "";
    const mrB = b.material_request_number ?? "";
    if (mrA !== mrB) return mrA.localeCompare(mrB);
    return (a.item_name ?? "").localeCompare(b.item_name ?? "");
  });

  const workerRef =
    dispatches.find((d) => workerIdFromRef(d.worker_name) === filters.worker_name)?.worker_name ??
    filters.worker_name;

  return {
    worker_name: workerRef,
    date_from,
    date_to,
    material_request_id: filters.material_request_id ?? null,
    dispatch_id: filters.dispatch_id ?? null,
    lines,
  };
}
