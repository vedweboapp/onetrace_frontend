import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import type {
  WorkflowColourStatus,
  WorkflowColourStatusCreatePayload,
  WorkflowColourStatusListResponse,
  WorkflowColourStatusUpdatePayload,
} from "@/shared/types/workflow-colour-status.types";
import { resolveMaterialStatusRequestUrl } from "./material-status-http.util";
import { MATERIAL_STATUS_PATHS } from "./material-status.paths";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

type MaterialStatusApiRow = {
  id: number;
  created_by: WorkflowColourStatus["created_by"];
  modified_by: WorkflowColourStatus["modified_by"];
  created_at: string;
  modified_at: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  status_name?: string;
  name?: string;
  bg_color?: string;
  text_color?: string;
  bg_colour?: string;
  text_colour?: string;
  is_active?: boolean;
  deleted_by?: unknown;
  organization?: number;
};

function normalizeMaterialStatusRow(row: MaterialStatusApiRow): WorkflowColourStatus {
  return {
    id: row.id,
    created_by: row.created_by,
    modified_by: row.modified_by,
    created_at: row.created_at,
    modified_at: row.modified_at,
    deleted_at: row.deleted_at,
    is_deleted: row.is_deleted,
    status_name: row.name ?? row.status_name ?? "",
    bg_colour: row.bg_colour ?? row.bg_color ?? "#E5E7EB",
    text_colour: row.text_colour ?? row.text_color ?? "#374151",
    is_active: row.is_active,
    deleted_by: row.deleted_by,
    organization: row.organization,
  };
}

function toWriteBody(body: WorkflowColourStatusCreatePayload): Record<string, string> {
  return {
    name: body.status_name,
    bg_colour: body.bg_colour,
    text_colour: body.text_colour,
  };
}

function toPatchBody(body: WorkflowColourStatusUpdatePayload): Record<string, string | boolean> {
  const payload: Record<string, string | boolean> = {};
  if (body.status_name !== undefined) payload.name = body.status_name;
  if (body.bg_colour !== undefined) payload.bg_colour = body.bg_colour;
  if (body.text_colour !== undefined) payload.text_colour = body.text_colour;
  if (body.is_active !== undefined) payload.is_active = body.is_active;
  return payload;
}

export type MaterialStatusListFilters = {
  search?: string;
  is_active?: boolean;
};

export async function fetchMaterialStatusesPage(
  page = 1,
  pageSize = 20,
  filters?: MaterialStatusListFilters,
): Promise<{ items: WorkflowColourStatus[]; pagination: WorkflowColourStatusListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (filters?.is_active !== undefined) params.is_active = filters.is_active;

  const { data } = await api.get<WorkflowColourStatusListResponse>(
    resolveMaterialStatusRequestUrl(MATERIAL_STATUS_PATHS.list),
    { params },
  );
  assertEnvelopeSuccess(data);
  return {
    items: (data.data as unknown as MaterialStatusApiRow[]).map(normalizeMaterialStatusRow),
    pagination: data.pagination,
  };
}

export async function fetchMaterialStatus(id: number): Promise<WorkflowColourStatus> {
  const { data } = await api.get<ApiEnvelope<MaterialStatusApiRow>>(
    resolveMaterialStatusRequestUrl(MATERIAL_STATUS_PATHS.detail(id)),
  );
  assertApiSuccess(data);
  return normalizeMaterialStatusRow(data.data);
}

export async function createMaterialStatus(
  body: WorkflowColourStatusCreatePayload,
): Promise<WorkflowColourStatus> {
  const { data } = await api.post<ApiEnvelope<MaterialStatusApiRow>>(
    resolveMaterialStatusRequestUrl(MATERIAL_STATUS_PATHS.list),
    toWriteBody(body),
  );
  assertApiSuccess(data);
  return normalizeMaterialStatusRow(data.data);
}

export async function updateMaterialStatus(
  id: number,
  body: WorkflowColourStatusUpdatePayload,
): Promise<WorkflowColourStatus> {
  const { data } = await api.patch<ApiEnvelope<MaterialStatusApiRow>>(
    resolveMaterialStatusRequestUrl(MATERIAL_STATUS_PATHS.detail(id)),
    toPatchBody(body),
  );
  assertApiSuccess(data);
  return normalizeMaterialStatusRow(data.data);
}

export async function deleteMaterialStatus(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(
    resolveMaterialStatusRequestUrl(MATERIAL_STATUS_PATHS.detail(id)),
  );
  assertEnvelopeSuccess(data);
}
