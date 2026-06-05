import type {
  DispatchDetail,
  DispatchLineItem,
  DispatchListItem,
  DispatchLogEntry,
  DispatchPagination,
  DispatchRestockPayload,
} from "@/features/dispatches/types/dispatch.types";
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
  return { items: slice, pagination };
}

export async function fetchDispatchMock(id: number): Promise<DispatchDetail | null> {
  return getDispatchMockEntity(id);
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
    created_by: { id: 1, email: "admin@yopmail.com", username: "admin" },
    modified_by: null,
  };

  upsertDispatchMockEntity(detail);
  return detail;
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

    line.restocked_quantity += applied;
    line.restock_history.push({ quantity: applied, restocked_at: now });
    restockedUnits += applied;

    logs.unshift({
      id: `dlog-${Date.now()}-${line.id}-${Math.random().toString(36).slice(2, 6)}`,
      title: "Item restocked",
      description: `${line.item.name ?? `Item #${line.item.id}`}: returned ${applied} unit(s) to inventory.`,
      occurred_at: now,
      tag: "restock",
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
          title: "Items restocked",
          description: `${detail.dispatch_number}: ${line.item.name ?? `Item #${line.item.id}`} — ${applied} unit(s) returned.`,
          occurred_at: now,
          tag: "restock",
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
