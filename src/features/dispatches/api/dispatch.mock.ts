import type {
  CreateDispatchReturnRequestPayload,
  DispatchDetail,
  DispatchLineItem,
  DispatchListItem,
  DispatchLogEntry,
  DispatchPagination,
  DispatchRestockPayload,
  DispatchReturnItemsData,
  DispatchReturnRequest,
  DispatchReturnRequestListFilters,
  DispatchReturnToStockPayload,
  WorkerReturnMaterialsData,
  WorkerReturnMaterialsFilters,
} from "@/features/dispatches/types/dispatch.types";
import {
  allocateDispatchReturnRequestMockId,
  listDispatchReturnRequestMocks,
  upsertDispatchReturnRequestMock,
  getDispatchReturnRequestMock,
} from "./dispatch-return-request.mock-store";
import { filterReturnRequests } from "@/features/dispatches/utils/return-request-list.util";
import {
  allocateReturnQuantityAcrossSources,
  buildDispatchReturnItems,
  buildWorkerReturnMaterials,
} from "@/features/dispatches/utils/dispatch-return.util";
import { buildDispatchLineSummaries } from "@/features/dispatches/utils/dispatch-summary.util";
import { allocateReturnQuantityAcrossDispatchLines } from "@/features/dispatches/utils/dispatch-line-aggregate.util";
import {
  DEFAULT_MOCK_DISPATCH_USER,
  enrichDispatchDetail,
  enrichDispatchListItem,
} from "@/features/dispatches/utils/dispatch-enrich.util";
import type { DispatchUserRef } from "@/features/dispatches/types/dispatch.types";
import { getMaterialRequestMockRecord, saveMaterialRequestMockRecord } from "@/features/material-requests/api/material-request.mock-store";
import {
  allocateDispatchMockId,
  getDispatchMockEntity,
  listDispatchMockEntities,
  upsertDispatchMockEntity,
} from "./dispatch.mock-store";

export type DispatchListFilters = {
  search?: string;
  status?: string;
  worker_name?: string | number;
  material_request_id?: number;
};

export type CreateDispatchLineInput = {
  lineKey: string;
  materialRequestLineId?: number | null;
  job?: DispatchLineItem["job"];
  itemId: number;
  itemName: string;
  stockQuantity?: number | null;
  workerName: DispatchDetail["worker_name"];
  requestedQuantity: number;
  dispatchedQuantity: number;
  isExtra: boolean;
};

export type CreateDispatchFromMaterialRequestInput = {
  materialRequestId: number;
  materialRequestNumber: string;
  jobName?: string | null;
  workerName: DispatchDetail["worker_name"];
  dispatchedBy?: DispatchUserRef;
  lines: CreateDispatchLineInput[];
};

function workerLabel(worker: DispatchDetail["worker_name"]): string {
  if (worker && typeof worker === "object") {
    return worker.name?.trim() || worker.username?.trim() || worker.email?.trim() || `#${worker.id}`;
  }
  if (typeof worker === "number") return `#${worker}`;
  return "—";
}

function toListItem(detail: DispatchDetail): DispatchListItem {
  return {
    id: detail.id,
    dispatch_number: detail.dispatch_number,
    material_request_id: detail.material_request_id,
    material_request_number: detail.material_request_number,
    job_name: detail.job_name,
    dispatch_date: detail.dispatch_date,
    status: detail.status,
    worker_name: detail.worker_name,
    total_qty: detail.total_qty,
    created_at: detail.created_at,
  };
}

function paginate<T>(rows: T[], page: number, pageSize: number): { slice: T[]; pagination: DispatchPagination } {
  const total_records = rows.length;
  const total_pages = Math.max(1, Math.ceil(total_records / pageSize) || 1);
  const current_page = Math.min(Math.max(1, page), total_pages);
  const start = (current_page - 1) * pageSize;
  return {
    slice: rows.slice(start, start + pageSize),
    pagination: {
      total_records,
      total_pages,
      current_page,
      page_size: pageSize,
      next: current_page < total_pages ? String(current_page + 1) : null,
      previous: current_page > 1 ? String(current_page - 1) : null,
    },
  };
}

function matchesFilters(row: DispatchDetail, filters?: DispatchListFilters): boolean {
  if (!filters) return true;
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    const hay = [row.dispatch_number, row.job_name, row.material_request_number, workerLabel(row.worker_name)]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.status?.trim() && row.status !== filters.status.trim()) return false;
  if (filters.material_request_id != null && row.material_request_id !== filters.material_request_id) return false;
  if (filters.worker_name != null && String(filters.worker_name).trim()) {
    const workerId = typeof row.worker_name === "number" ? row.worker_name : row.worker_name?.id;
    if (workerId == null || String(workerId) !== String(filters.worker_name).trim()) return false;
  }
  return true;
}

export async function fetchDispatchesPageMock(
  page = 1,
  pageSize = 20,
  filters?: DispatchListFilters,
): Promise<{ items: DispatchListItem[]; pagination: DispatchPagination }> {
  const all = listDispatchMockEntities()
    .filter((row) => matchesFilters(row, filters))
    .map(toListItem);
  const { slice, pagination } = paginate(all, page, pageSize);
  const items = await Promise.all(slice.map((row) => enrichDispatchListItem(row)));
  return { items, pagination };
}

export async function fetchDispatchMock(id: number): Promise<DispatchDetail | null> {
  const detail = getDispatchMockEntity(id);
  if (!detail) return null;
  const enriched = await enrichDispatchDetail(detail);
  return { ...enriched, line_summaries: buildDispatchLineSummaries(enriched.lines) };
}

export async function fetchDispatchLogsMock(id: number): Promise<DispatchLogEntry[]> {
  const detail = getDispatchMockEntity(id);
  return detail?.logs ?? [];
}

export function createDispatchFromMaterialRequestMock(input: CreateDispatchFromMaterialRequestInput): DispatchDetail {
  const id = allocateDispatchMockId();
  const now = new Date().toISOString();
  const activeLines = input.lines.filter((row) => row.dispatchedQuantity > 0);
  const total_qty = activeLines.reduce((sum, row) => sum + row.dispatchedQuantity, 0);

  const lines: DispatchLineItem[] = activeLines.map((row, index) => {
    const requested = row.isExtra ? 0 : row.requestedQuantity;
    const dispatched = row.dispatchedQuantity;
    const extra = row.isExtra ? dispatched : Math.max(0, dispatched - requested);
    const pending = row.isExtra ? 0 : Math.max(0, requested - dispatched);

    return {
      id: index + 1,
      line_key: row.lineKey,
      material_request_line_id: row.materialRequestLineId ?? null,
      job: row.job ?? null,
      item: {
        id: row.itemId,
        name: row.itemName,
        stock_quantity: row.stockQuantity ?? null,
      },
      worker_name: row.workerName,
      requested_quantity: requested,
      dispatched_quantity: dispatched,
      pending_quantity: pending,
      extra_quantity: extra,
      restocked_quantity: 0,
      restock_history: [],
      is_extra: row.isExtra,
      dispatched_at: now,
    };
  });

  const dispatchedBy = input.dispatchedBy ?? DEFAULT_MOCK_DISPATCH_USER;

  const detail: DispatchDetail = {
    id,
    dispatch_number: `DSP-${String(id).padStart(5, "0")}`,
    material_request_id: input.materialRequestId,
    material_request_number: input.materialRequestNumber,
    job_name: input.jobName ?? null,
    dispatch_date: now.slice(0, 10),
    status: "dispatched",
    worker_name: input.workerName,
    dispatch_to: workerLabel(input.workerName),
    dispatched_by: dispatchedBy,
    total_qty,
    lines,
    logs: [
      {
        id: `dlog-${Date.now()}`,
        title: "Dispatch created",
        description: `Dispatched ${total_qty} unit(s) across ${lines.length} line(s).`,
        occurred_at: now,
        tag: "dispatch",
      },
    ],
    created_at: now,
    modified_at: null,
    created_by: dispatchedBy,
    modified_by: null,
  };

  upsertDispatchMockEntity(detail);
  return detail;
}

export async function fetchWorkerReturnMaterialsMock(
  filters: WorkerReturnMaterialsFilters,
): Promise<WorkerReturnMaterialsData> {
  const pending = listDispatchReturnRequestMocks();
  return buildWorkerReturnMaterials(listDispatchMockEntities(), filters, pending);
}

export async function createDispatchReturnRequestMock(
  payload: CreateDispatchReturnRequestPayload,
): Promise<DispatchReturnRequest> {
  const now = new Date().toISOString();
  const id = allocateDispatchReturnRequestMockId();
  const lines: DispatchReturnRequest["lines"] = [];

  let requestLines = payload.lines ?? [];

  if (payload.groups?.length) {
    const workerMaterials = buildWorkerReturnMaterials(
      listDispatchMockEntities(),
      {
        worker_name: payload.worker_name,
        date_preset: "custom",
        date_from: "2000-01-01",
        date_to: "2099-12-31",
      },
      listDispatchReturnRequestMocks(),
    );

    requestLines = payload.groups.flatMap((group) => {
      const row = workerMaterials.lines.find((line) => line.group_key === group.group_key);
      if (!row) return [];
      return allocateReturnQuantityAcrossSources(row, group.quantity, group.return_type, group.reason);
    });
  }

  for (const input of requestLines) {
    const qty = Math.max(0, input.quantity);
    if (qty <= 0) continue;
    const detail = getDispatchMockEntity(input.dispatch_id);
    if (!detail) continue;
    const line = detail.lines.find((row) => row.id === input.line_id);
    if (!line) continue;

    const returnable = Math.max(0, line.dispatched_quantity - line.restocked_quantity);
    const pending = listDispatchReturnRequestMocks()
      .filter((r) => r.status === "pending")
      .flatMap((r) => r.lines)
      .filter((l) => l.dispatch_id === input.dispatch_id && l.line_id === input.line_id)
      .reduce((sum, l) => sum + l.quantity, 0);
    const applied = Math.min(qty, Math.max(0, returnable - pending));
    if (applied <= 0) continue;

    lines.push({
      dispatch_id: detail.id,
      dispatch_number: detail.dispatch_number,
      line_id: line.id,
      item_id: line.item.id,
      item_name: line.item.name?.trim() || null,
      job_name: line.job?.title?.trim() || null,
      quantity: applied,
      return_type: input.return_type,
      reason: input.reason?.trim() || null,
    });
  }

  if (lines.length === 0) throw new Error("No valid return lines in request");

  const workerRef =
    getDispatchMockEntity(lines[0].dispatch_id)?.worker_name ?? payload.worker_name;

  const request: DispatchReturnRequest = {
    id,
    request_number: `RR-${String(id).padStart(5, "0")}`,
    worker_name: workerRef,
    status: "pending",
    lines,
    requested_at: now,
    completed_at: null,
  };

  upsertDispatchReturnRequestMock(request);
  return request;
}

export async function fetchDispatchReturnRequestMock(id: number): Promise<DispatchReturnRequest | null> {
  return getDispatchReturnRequestMock(id);
}

export async function fetchDispatchReturnRequestsMock(
  filters?: DispatchReturnRequestListFilters,
): Promise<DispatchReturnRequest[]> {
  const resolveMr = (dispatchId: number) => {
    const detail = getDispatchMockEntity(dispatchId);
    return detail && detail.material_request_id > 0 ? detail.material_request_id : null;
  };
  return filterReturnRequests(listDispatchReturnRequestMocks(), filters ?? {}, resolveMr);
}

export async function completeDispatchReturnRequestMock(requestId: number): Promise<DispatchReturnRequest> {
  const request = getDispatchReturnRequestMock(requestId);
  if (!request) throw new Error(`Return request ${requestId} not found`);
  if (request.status !== "pending") throw new Error("Return request is not pending");

  const byDispatch = new Map<number, DispatchReturnToStockPayload["lines"]>();
  for (const line of request.lines) {
    const bucket = byDispatch.get(line.dispatch_id) ?? [];
    bucket.push({
      line_id: line.line_id,
      quantity: line.quantity,
      return_type: line.return_type,
    });
    byDispatch.set(line.dispatch_id, bucket);
  }

  for (const [dispatchId, lines] of byDispatch) {
    await returnDispatchToStockMock(dispatchId, { lines });
  }

  const updated: DispatchReturnRequest = {
    ...request,
    status: "completed",
    completed_at: new Date().toISOString(),
  };
  upsertDispatchReturnRequestMock(updated);
  return updated;
}

export async function fetchDispatchReturnItemsMock(dispatchId: number): Promise<DispatchReturnItemsData | null> {
  const detail = getDispatchMockEntity(dispatchId);
  if (!detail) return null;
  return buildDispatchReturnItems(detail);
}

export async function returnDispatchToStockMock(
  dispatchId: number,
  payload: DispatchReturnToStockPayload,
): Promise<DispatchDetail> {
  let lines = payload.lines ?? [];

  if (payload.groups?.length) {
    const returnData = await fetchDispatchReturnItemsMock(dispatchId);
    if (!returnData) throw new Error(`Dispatch ${dispatchId} not found`);

    lines = payload.groups.flatMap((group) => {
      const qty = Math.max(0, group.quantity);
      if (qty <= 0) return [];
      const row = returnData.lines.find((line) => (line.group_key ?? `line-${line.line_id}`) === group.group_key);
      if (!row) return [];
      const sources = row.sources ?? [{ line_id: row.line_id, returnable_quantity: row.returnable_quantity }];
      return allocateReturnQuantityAcrossDispatchLines(sources, qty).map((allocated) => ({
        line_id: allocated.line_id,
        quantity: allocated.quantity,
        return_type: group.return_type,
      }));
    });
  }

  const restockPayload: DispatchRestockPayload = {
    lines: lines.map((row) => ({
      line_id: row.line_id,
      quantity: row.quantity,
      return_type: row.return_type,
    })),
  };
  const detail = await restockDispatchMock(dispatchId, restockPayload);
  return { ...detail, line_summaries: buildDispatchLineSummaries(detail.lines) };
}

export async function restockDispatchMock(
  dispatchId: number,
  payload: DispatchRestockPayload,
): Promise<DispatchDetail> {
  const detail = getDispatchMockEntity(dispatchId);
  if (!detail) throw new Error(`Dispatch ${dispatchId} not found`);

  const now = new Date().toISOString();
  let restockedUnits = 0;
  const logs = [...(detail.logs ?? [])];
  const lines = detail.lines.map((line) => ({ ...line, restock_history: [...line.restock_history] }));

  for (const input of payload.lines) {
    const qty = Math.max(0, input.quantity);
    if (qty <= 0) continue;
    const lineIndex = lines.findIndex((row) => row.id === input.line_id);
    if (lineIndex < 0) continue;

    const line = lines[lineIndex];
    const maxReturn = Math.max(0, line.dispatched_quantity - line.restocked_quantity);
    const applied = Math.min(qty, maxReturn);
    if (applied <= 0) continue;

    const returnType = input.return_type === "faulty" ? "faulty" : "unused";

    line.restocked_quantity += applied;
    line.restock_history.push({ quantity: applied, restocked_at: now, return_type: returnType });
    restockedUnits += applied;

    const reasonLabel = returnType === "faulty" ? "faulty" : "unused";
    logs.unshift({
      id: `dlog-${Date.now()}-${line.id}-${Math.random().toString(36).slice(2, 6)}`,
      title: returnType === "faulty" ? "Faulty item returned" : "Item returned to stock",
      description: `${line.item.name ?? `Item #${line.item.id}`}: ${applied} unit(s) (${reasonLabel}) added back to inventory.`,
      occurred_at: now,
      tag: "return_to_stock",
      line_id: line.id,
    });

    if (detail.material_request_id > 0 && line.line_key) {
      const mrRecord = getMaterialRequestMockRecord(detail.material_request_id);
      mrRecord.lineRestocked[line.line_key] = (mrRecord.lineRestocked[line.line_key] ?? 0) + applied;
      mrRecord.inventoryCredits[String(line.item.id)] =
        (mrRecord.inventoryCredits[String(line.item.id)] ?? 0) + applied;
      mrRecord.logs = [
        {
          id: `log-${Date.now()}-${line.line_key}`,
          title: returnType === "faulty" ? "Faulty item returned" : "Items returned to stock",
          description: `${detail.dispatch_number}: ${line.item.name ?? `Item #${line.item.id}`} — ${applied} unit(s) (${reasonLabel}) returned.`,
          occurred_at: now,
          tag: "return_to_stock",
          dispatch_id: dispatchId,
        },
        ...mrRecord.logs,
      ];
      saveMaterialRequestMockRecord(detail.material_request_id, mrRecord);
    }
  }

  if (restockedUnits <= 0) return detail;

  const updated: DispatchDetail = {
    ...detail,
    lines,
    logs,
    modified_at: now,
  };
  upsertDispatchMockEntity(updated);
  return updated;
}
