import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { MATERIAL_REQUEST_PATHS } from "./material-request.paths";
import type {
  MaterialRequestCreatePayload,
  MaterialRequestDetail,
  MaterialRequestListItem,
  MaterialRequestListResponse,
  MaterialRequestUpdatePayload,
} from "../types/material-request.types";

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

  const { data } = await api.get<MaterialRequestListResponse>(MATERIAL_REQUEST_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchMaterialRequest(
  id: number,
  options?: { silent?: boolean },
): Promise<MaterialRequestDetail> {
  const { data } = await api.get<ApiEnvelope<MaterialRequestDetail>>(MATERIAL_REQUEST_PATHS.detail(id), {
    skipErrorToast: options?.silent === true,
  });
  assertApiSuccess(data);
  return data.data;
}

export async function createMaterialRequest(body: MaterialRequestCreatePayload): Promise<MaterialRequestDetail> {
  const { data } = await api.post<ApiEnvelope<MaterialRequestDetail>>(MATERIAL_REQUEST_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateMaterialRequest(
  id: number,
  body: MaterialRequestUpdatePayload,
): Promise<MaterialRequestDetail> {
  const { data } = await api.patch<ApiEnvelope<MaterialRequestDetail>>(MATERIAL_REQUEST_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}
