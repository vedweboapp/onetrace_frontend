import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { CHECKLIST_TYPE_PATHS } from "./checklist-type.paths";
import type {
  ChecklistType,
  ChecklistTypeCreatePayload,
  ChecklistTypeListResponse,
  ChecklistTypeUpdatePayload,
} from "../types/checklist-type.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type ChecklistTypeListFilters = {
  search?: string;
  is_active?: boolean;
  project_type?: number;
};

export async function fetchChecklistTypesPage(
  page = 1,
  pageSize = 20,
  filters?: ChecklistTypeListFilters,
): Promise<{ items: ChecklistType[]; pagination: ChecklistTypeListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);
  if (typeof filters?.project_type === "number" && filters.project_type > 0) {
    params.project_type = filters.project_type;
  }

  const { data } = await api.get<ChecklistTypeListResponse>(CHECKLIST_TYPE_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchChecklistType(id: number): Promise<ChecklistType> {
  const { data } = await api.get<ApiEnvelope<ChecklistType>>(CHECKLIST_TYPE_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createChecklistType(body: ChecklistTypeCreatePayload | FormData): Promise<ChecklistType> {
  const { data } = await api.post<ApiEnvelope<ChecklistType>>(CHECKLIST_TYPE_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

function definedUpdateKeys(body: ChecklistTypeUpdatePayload): (keyof ChecklistTypeUpdatePayload)[] {
  return (Object.keys(body) as (keyof ChecklistTypeUpdatePayload)[]).filter(
    (key) => body[key] !== undefined,
  );
}

/** Partial updates (e.g. `{ is_active: false }`) use PATCH; full saves use PUT. */
export async function patchChecklistType(
  id: number,
  body: ChecklistTypeUpdatePayload | FormData,
): Promise<ChecklistType> {
  const { data } = await api.patch<ApiEnvelope<ChecklistType>>(CHECKLIST_TYPE_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateChecklistType(
  id: number,
  body: ChecklistTypeUpdatePayload | FormData,
): Promise<ChecklistType> {
  if (!(body instanceof FormData) && definedUpdateKeys(body).length === 1) {
    return patchChecklistType(id, body);
  }
  const { data } = await api.patch<ApiEnvelope<ChecklistType>>(CHECKLIST_TYPE_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteChecklistType(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(CHECKLIST_TYPE_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
