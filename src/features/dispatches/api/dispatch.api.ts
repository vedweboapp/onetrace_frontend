import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { resolveDispatchRequestUrl } from "./dispatch-http.util";
import { DISPATCH_PATHS } from "./dispatch.paths";
import type {
  DispatchDetail,
  DispatchListItem,
  DispatchListResponse,
  DispatchLogEntry,
  DispatchRestockPayload,
} from "../types/dispatch.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
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
  return { items: data.data, pagination: data.pagination };
}

export async function fetchDispatch(id: number): Promise<DispatchDetail> {
  const { data } = await api.get<ApiEnvelope<DispatchDetail>>(resolveDispatchRequestUrl(DISPATCH_PATHS.detail(id)));
  assertApiSuccess(data);
  return data.data;
}

export async function fetchDispatchLogs(id: number): Promise<DispatchLogEntry[]> {
  const { data } = await api.get<ApiEnvelope<DispatchLogEntry[]>>(
    resolveDispatchRequestUrl(DISPATCH_PATHS.logs(id)),
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
