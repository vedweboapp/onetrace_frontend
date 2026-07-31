import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { MATERIAL_REQUEST_PATHS } from "./material-request.paths";
import { DISPATCH_PATHS } from "@/features/dispatches/api/dispatch.paths";
import type { MaterialRequestDispatchPayload } from "../types/material-request-dispatch.types";
import type {
  MaterialRequestCreatePayload,
  MaterialRequestDetail,
  MaterialRequestListItem,
  MaterialRequestListResponse,
  MaterialRequestLogEntry,
  MaterialRequestRestockPayload,
  MaterialRequestUpdatePayload,
} from "../types/material-request.types";
import {
  normalizeMaterialRequestListItems,
  normalizeMaterialRequestRow,
} from "../utils/material-request-normalize.util";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type MaterialRequestListFilters = {
  search?: string;
  status?: string;
  requested_date?: string;
  worker_name?: string | number;
  job?: string | number;
  job_id?: string | number;
};

export async function fetchMaterialRequestsPage(
  page = 1,
  pageSize = 20,
  filters?: MaterialRequestListFilters,
): Promise<{ items: MaterialRequestListItem[]; pagination: MaterialRequestListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (filters?.status?.trim()) params.status = filters.status.trim();
  if (filters?.requested_date?.trim()) params.requested_date = filters.requested_date.trim();
  if (filters?.worker_name != null && String(filters.worker_name).trim()) {
    params.worker_name = String(filters.worker_name).trim();
  }

  const jobFilter = filters?.job ?? filters?.job_id;
  if (jobFilter != null && String(jobFilter).trim()) {
    params.job = String(jobFilter).trim();
  }

  const { data } = await api.get<MaterialRequestListResponse>(
    MATERIAL_REQUEST_PATHS.list,
    { params },
  );
  assertEnvelopeSuccess(data);
  const rows = Array.isArray(data.data) ? data.data : [];
  return {
    items: normalizeMaterialRequestListItems(rows),
    pagination: data.pagination,
  };
}

export async function fetchAllMaterialRequestIds(filters?: MaterialRequestListFilters): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchMaterialRequestsPage(page, pageSize, filters));
}

export async function fetchMaterialRequest(
  id: number,
  options?: { silent?: boolean },
): Promise<MaterialRequestDetail> {
  const { data } = await api.get<ApiEnvelope<MaterialRequestDetail>>(
    MATERIAL_REQUEST_PATHS.detail(id),
    {
      skipErrorToast: options?.silent === true,
    },
  );
  assertApiSuccess(data);
  return normalizeMaterialRequestRow(data.data);
}

export async function dispatchMaterialRequest(
  id: number,
  _detail: MaterialRequestDetail,
  payload: MaterialRequestDispatchPayload,
  _itemLabels: Record<number, string>,
): Promise<MaterialRequestDetail> {
  void _detail;
  void _itemLabels;
  const { data } = await api.post<ApiEnvelope<MaterialRequestDetail>>(
    DISPATCH_PATHS.list,
    payload,
  );
  assertApiSuccess(data);
  return normalizeMaterialRequestRow(data.data);
}

export async function createMaterialRequest(body: MaterialRequestCreatePayload): Promise<MaterialRequestDetail> {
  const { data } = await api.post<ApiEnvelope<MaterialRequestDetail>>(
    MATERIAL_REQUEST_PATHS.list,
    body,
  );
  assertApiSuccess(data);
  return normalizeMaterialRequestRow(data.data);
}

export async function updateMaterialRequest(
  id: number,
  body: MaterialRequestUpdatePayload,
): Promise<MaterialRequestDetail> {
  const { data } = await api.patch<ApiEnvelope<MaterialRequestDetail>>(
    MATERIAL_REQUEST_PATHS.detail(id),
    body,
  );
  assertApiSuccess(data);
  return normalizeMaterialRequestRow(data.data);
}

export async function fetchMaterialRequestLogs(id: number): Promise<MaterialRequestLogEntry[]> {
  const { data } = await api.get<ApiEnvelope<MaterialRequestLogEntry[]>>(
    MATERIAL_REQUEST_PATHS.logs(id),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function restockMaterialRequest(
  id: number,
  payload: MaterialRequestRestockPayload,
): Promise<MaterialRequestDetail> {
  const { data } = await api.post<ApiEnvelope<MaterialRequestDetail>>(
    MATERIAL_REQUEST_PATHS.restock(id),
    payload,
  );
  assertApiSuccess(data);
  return normalizeMaterialRequestRow(data.data);
}
