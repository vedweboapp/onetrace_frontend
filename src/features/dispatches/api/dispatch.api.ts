import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { DISPATCH_PATHS } from "./dispatch.paths";
import { DISPATCH_RETURN_REQUEST_PATHS } from "./dispatch.paths";
import type {
  CreateDispatchReturnRequestPayload,
  DispatchDetail,
  DispatchListItem,
  DispatchListResponse,
  DispatchLogEntry,
  DispatchRestockPayload,
  DispatchReturnItemsData,
  DispatchReturnRequest,
  DispatchReturnRequestListFilters,
  DispatchReturnToStockPayload,
  WorkerReturnDatePreset,
  WorkerReturnMaterialsData,
  WorkerReturnMaterialsFilters,
} from "../types/dispatch.types";
function appendDatePresetParams(
  params: Record<string, string | number>,
  filters: {
    date_preset?: WorkerReturnDatePreset;
    date_from?: string;
    date_to?: string;
  },
) {
  if (!filters.date_preset) return;
  params.date_preset = filters.date_preset;
  if (filters.date_preset === "custom") {
    if (filters.date_from?.trim()) params.date_from = filters.date_from.trim();
    if (filters.date_to?.trim()) params.date_to = filters.date_to.trim();
  }
}

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function normalizeDispatchOrderNumber<T extends { dispatch_order_number?: string; dispatch_number?: string }>(row: T): T {
  const dispatchOrderNumber = row.dispatch_order_number?.trim() || row.dispatch_number?.trim() || "";
  return {
    ...row,
    dispatch_order_number: dispatchOrderNumber,
  };
}

function normalizeDispatchListItem(row: DispatchListItem): DispatchListItem {
  const norm = normalizeDispatchOrderNumber(row) as any;
  const lines = Array.isArray(norm.lines) ? norm.lines : undefined;
  const itemsCount =
    typeof norm.items_count === "number" && Number.isFinite(norm.items_count)
      ? norm.items_count
      : typeof norm.line_count === "number" && Number.isFinite(norm.line_count)
        ? norm.line_count
        : Array.isArray(lines)
          ? lines.length
          : null;
  return {
    ...norm,
    worker_name: norm.worker ?? norm.worker_name,
    material_request_id: norm.material_request ?? norm.material_request_id,
    lines,
    items_count: itemsCount,
  };
}

function normalizeDispatchLine(l: any) {
  const rawItem = l.item;
  const item =
    rawItem != null && typeof rawItem === "object"
      ? { id: rawItem.id, name: rawItem.name ?? null, sku: rawItem.sku ?? null, stock_quantity: rawItem.stock_quantity ?? null }
      : { id: typeof rawItem === "number" ? rawItem : 0, name: l.item_name ?? null, sku: l.item_sku ?? null, stock_quantity: null };
  return {
    ...l,
    item,
    requested_quantity: l.requested_quantity ?? 0,
    dispatched_quantity: l.dispatched_quantity ?? 0,
    pending_quantity: l.pending_quantity ?? 0,
    extra_quantity: l.extra_quantity ?? 0,
    restocked_quantity: l.restocked_quantity ?? 0,
    restock_history: l.restock_history ?? [],
  };
}

function normalizeDispatchDetail(row: DispatchDetail): DispatchDetail {
  const norm = normalizeDispatchOrderNumber(row) as any;
  return {
    ...norm,
    worker_name: norm.worker ?? norm.worker_name,
    material_request_id: norm.material_request ?? norm.material_request_id,
    lines: Array.isArray(norm.lines) ? norm.lines.map(normalizeDispatchLine) : [],
  };
}

function normalizeDispatchReturnItemsData(row: DispatchReturnItemsData): DispatchReturnItemsData {
  return normalizeDispatchOrderNumber(row);
}

export type DispatchListFilters = {
  search?: string;
  status?: string;
  worker_name?: string | number;
  material_request_id?: number;
  job?: number;
};

export async function fetchDispatchesPage(
  page = 1,
  pageSize = 20,
  filters?: DispatchListFilters,
): Promise<{ items: DispatchListItem[]; pagination: DispatchListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  if (filters?.search?.trim()) params.search = filters.search.trim();
  if (filters?.status?.trim()) params.status = filters.status.trim();
  if (filters?.worker_name != null && String(filters.worker_name).trim()) {
    params.worker_name = String(filters.worker_name).trim();
  }
  if (filters?.material_request_id != null) params.material_request_id = filters.material_request_id;
  if (filters?.job != null) params.job = filters.job;

  const { data } = await api.get<DispatchListResponse>(DISPATCH_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return {
    items: data.data.map((row) => normalizeDispatchListItem(row)),
    pagination: data.pagination,
  };
}

export async function fetchDispatch(id: number): Promise<DispatchDetail> {
  const { data } = await api.get<ApiEnvelope<DispatchDetail>>(DISPATCH_PATHS.detail(id));
  assertApiSuccess(data);
  return normalizeDispatchDetail(data.data);
}

export async function fetchDispatchLogs(id: number): Promise<DispatchLogEntry[]> {
  const { data } = await api.get<ApiEnvelope<DispatchLogEntry[]>>(
    DISPATCH_PATHS.logs(id),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function fetchWorkerReturnMaterials(
  filters: WorkerReturnMaterialsFilters,
): Promise<DispatchDetail[]> {
  const params: Record<string, string | number> = { worker: filters.worker_name };
  if (filters.dispatch_id != null) params.dispatch_id = filters.dispatch_id;
  if (filters.material_request_id != null) params.material_request_id = filters.material_request_id;

  const { data } = await api.get<ApiEnvelope<DispatchDetail[]>>(
    DISPATCH_PATHS.list,
    { params },
  );
  assertApiSuccess(data);
  return data.data;
}

/** Normalize the real API shape → UI-expected shape for DispatchReturnRequest */
function normalizeReturnRequest(raw: any): DispatchReturnRequest {
  if (!raw) {
    return {} as DispatchReturnRequest;
  }
  const rawLines: any[] = raw.return_request_line ?? raw.lines ?? [];
  const lines = rawLines.map((l: any) => ({
    id: l.id,
    dispatch_line: l.dispatch_line,
    item: l.item ?? null,
    item_id: l.item?.id ?? l.item_id,
    item_name: l.item?.name ?? l.item_name ?? null,
    dispatch_id: l.dispatch_id ?? null,
    dispatch_order_number: l.dispatch_order_number ?? null,
    dispatch_quantity: l.dispatch_quantity ?? null,
    quantity: l.quantity,
    return_type: l.return_type,
    reason: l.reason ?? null,
  }));

  // API returns `worker`; map to `worker_name` for legacy UI compat
  const worker = raw.worker ?? raw.worker_name ?? null;

  return {
    ...raw,
    lines,
    worker,
    worker_name: worker,
  } as DispatchReturnRequest;
}

export async function createDispatchReturnRequest(
  payload: CreateDispatchReturnRequestPayload,
): Promise<DispatchReturnRequest> {
  const { data } = await api.post<any>(
    DISPATCH_RETURN_REQUEST_PATHS.list,
    payload,
  );
  const raw = data?.success === true ? data.data : data;
  return normalizeReturnRequest(raw);
}

export async function fetchDispatchReturnRequests(
  filters?: DispatchReturnRequestListFilters,
): Promise<DispatchReturnRequest[]> {
  const params: Record<string, string | number> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.worker_name != null) params.worker_name = filters.worker_name;
  if (filters?.search?.trim()) params.search = filters.search.trim();
  if (filters) appendDatePresetParams(params, filters);
  if (filters?.material_request_id != null) params.material_request_id = filters.material_request_id;
  if (filters?.job != null) params.job = filters.job;

  const { data } = await api.get<any>(
    DISPATCH_RETURN_REQUEST_PATHS.list,
    { params },
  );
  // This API returns { success, data: [...] } envelope OR raw array
  const rawList: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? (assertApiSuccess(data), data.data)
      : [];
  return rawList.map(normalizeReturnRequest);
}

export async function fetchDispatchReturnRequest(id: number): Promise<DispatchReturnRequest> {
  const { data } = await api.get<any>(
    DISPATCH_RETURN_REQUEST_PATHS.detail(id),
  );
  // API returns the object directly (no { success, data } envelope)
  const raw = data?.success === true ? data.data : data;
  return normalizeReturnRequest(raw);
}

export async function completeDispatchReturnRequest(id: number): Promise<DispatchReturnRequest> {
  const { data } = await api.post<any>(
    DISPATCH_RETURN_REQUEST_PATHS.complete(id),
  );
  const raw = data?.success === true ? data.data : data;
  return normalizeReturnRequest(raw);
}

export async function approveReturnRequest(id: number): Promise<DispatchReturnRequest> {
  const { data } = await api.post<any>(
    DISPATCH_RETURN_REQUEST_PATHS.approve(id),
  );
  const raw = data?.success === true ? data.data : data;
  return normalizeReturnRequest(raw);
}

export async function rejectReturnRequest(id: number): Promise<DispatchReturnRequest> {
  const { data } = await api.post<any>(
    DISPATCH_RETURN_REQUEST_PATHS.reject(id),
  );
  const raw = data?.success === true ? data.data : data;
  return normalizeReturnRequest(raw);
}

export async function fetchDispatchReturnItems(id: number): Promise<DispatchReturnItemsData> {
  const { data } = await api.get<ApiEnvelope<DispatchReturnItemsData>>(
    DISPATCH_PATHS.returnItems(id),
  );
  assertApiSuccess(data);
  return normalizeDispatchReturnItemsData(data.data);
}
 
export async function returnDispatchToStock(
  id: number,
  payload: DispatchReturnToStockPayload,
): Promise<DispatchDetail> {
  const { data } = await api.post<ApiEnvelope<DispatchDetail>>(
    DISPATCH_PATHS.returnToStock(id),
    payload,
  );
  assertApiSuccess(data);
  return data.data;
}

export async function restockDispatch(id: number, payload: DispatchRestockPayload): Promise<DispatchDetail> {
  const { data } = await api.post<ApiEnvelope<DispatchDetail>>(
    DISPATCH_PATHS.restock(id),
    payload,
  );
  assertApiSuccess(data);
  return data.data;
}
