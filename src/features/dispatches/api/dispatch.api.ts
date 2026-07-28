import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { resolveDispatchRequestUrl } from "./dispatch-http.util";
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
  return normalizeDispatchOrderNumber(row);
}

function normalizeDispatchDetail(row: DispatchDetail): DispatchDetail {
  return normalizeDispatchOrderNumber(row);
}

function normalizeDispatchReturnItemsData(row: DispatchReturnItemsData): DispatchReturnItemsData {
  return normalizeDispatchOrderNumber(row);
}

export type DispatchListFilters = {
  search?: string;
  status?: string;
  worker_name?: string | number;
  material_request_id?: number;
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

  const { data } = await api.get<DispatchListResponse>(resolveDispatchRequestUrl(DISPATCH_PATHS.list), { params });
  assertEnvelopeSuccess(data);
  return {
    items: data.data.map((row) => normalizeDispatchListItem(row)),
    pagination: data.pagination,
  };
}

export async function fetchDispatch(id: number): Promise<DispatchDetail> {
  const { data } = await api.get<ApiEnvelope<DispatchDetail>>(resolveDispatchRequestUrl(DISPATCH_PATHS.detail(id)));
  assertApiSuccess(data);
  return normalizeDispatchDetail(data.data);
}

export async function fetchDispatchLogs(id: number): Promise<DispatchLogEntry[]> {
  const { data } = await api.get<ApiEnvelope<DispatchLogEntry[]>>(
    resolveDispatchRequestUrl(DISPATCH_PATHS.logs(id)),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function fetchWorkerReturnMaterials(
  filters: WorkerReturnMaterialsFilters,
): Promise<WorkerReturnMaterialsData> {
  const params: Record<string, string | number> = { worker_name: filters.worker_name };
  appendDatePresetParams(params, filters);
  if (filters.dispatch_id != null) params.dispatch_id = filters.dispatch_id;
  if (filters.material_request_id != null) params.material_request_id = filters.material_request_id;

  const { data } = await api.get<ApiEnvelope<WorkerReturnMaterialsData>>(
    resolveDispatchRequestUrl(DISPATCH_PATHS.workerReturnMaterials),
    { params },
  );
  assertApiSuccess(data);
  return data.data;
}

export async function createDispatchReturnRequest(
  payload: CreateDispatchReturnRequestPayload,
): Promise<DispatchReturnRequest> {
  const { data } = await api.post<ApiEnvelope<DispatchReturnRequest>>(
    resolveDispatchRequestUrl(DISPATCH_RETURN_REQUEST_PATHS.list),
    payload,
  );
  assertApiSuccess(data);
  return data.data;
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

  const { data } = await api.get<ApiEnvelope<DispatchReturnRequest[]>>(
    resolveDispatchRequestUrl(DISPATCH_RETURN_REQUEST_PATHS.list),
    { params },
  );
  assertApiSuccess(data);
  return data.data;
}

export async function fetchDispatchReturnRequest(id: number): Promise<DispatchReturnRequest> {
  const { data } = await api.get<ApiEnvelope<DispatchReturnRequest>>(
    resolveDispatchRequestUrl(DISPATCH_RETURN_REQUEST_PATHS.detail(id)),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function completeDispatchReturnRequest(id: number): Promise<DispatchReturnRequest> {
  const { data } = await api.post<ApiEnvelope<DispatchReturnRequest>>(
    resolveDispatchRequestUrl(DISPATCH_RETURN_REQUEST_PATHS.complete(id)),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function fetchDispatchReturnItems(id: number): Promise<DispatchReturnItemsData> {
  const { data } = await api.get<ApiEnvelope<DispatchReturnItemsData>>(
    resolveDispatchRequestUrl(DISPATCH_PATHS.returnItems(id)),
  );
  assertApiSuccess(data);
  return normalizeDispatchReturnItemsData(data.data);
}
 
export async function returnDispatchToStock(
  id: number,
  payload: DispatchReturnToStockPayload,
): Promise<DispatchDetail> {
  const { data } = await api.post<ApiEnvelope<DispatchDetail>>(
    resolveDispatchRequestUrl(DISPATCH_PATHS.returnToStock(id)),
    payload,
  );
  assertApiSuccess(data);
  return data.data;
}

export async function restockDispatch(id: number, payload: DispatchRestockPayload): Promise<DispatchDetail> {
  const { data } = await api.post<ApiEnvelope<DispatchDetail>>(
    resolveDispatchRequestUrl(DISPATCH_PATHS.restock(id)),
    payload,
  );
  assertApiSuccess(data);
  return data.data;
}
