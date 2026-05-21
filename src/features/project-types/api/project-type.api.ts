import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { PROJECT_TYPE_PATHS } from "./project-type.paths";
import type {
  ProjectType,
  ProjectTypeCreatePayload,
  ProjectTypeListResponse,
  ProjectTypeUpdatePayload,
} from "../types/project-type.types";
import { projectTypeNameFromRow } from "../utils/project-type-display.util";

/** Normalize API rows that still return `name` instead of `project_type`. */
function normalizeProjectType(row: ProjectType & { name?: string | null }): ProjectType {
  return {
    ...row,
    project_type: projectTypeNameFromRow(row),
  };
}

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type ProjectTypeListFilters = {
  search?: string;
  is_active?: boolean;
};

export async function fetchProjectTypesPage(
  page = 1,
  pageSize = 20,
  filters?: ProjectTypeListFilters,
): Promise<{ items: ProjectType[]; pagination: ProjectTypeListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);

  const { data } = await api.get<ProjectTypeListResponse>(PROJECT_TYPE_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data.map(normalizeProjectType), pagination: data.pagination };
}

export async function fetchProjectType(id: number): Promise<ProjectType> {
  const { data } = await api.get<ApiEnvelope<ProjectType>>(PROJECT_TYPE_PATHS.detail(id));
  assertApiSuccess(data);
  return normalizeProjectType(data.data);
}

export async function createProjectType(body: ProjectTypeCreatePayload): Promise<ProjectType> {
  const { data } = await api.post<ApiEnvelope<ProjectType>>(PROJECT_TYPE_PATHS.list, body);
  assertApiSuccess(data);
  return normalizeProjectType(data.data);
}

export async function updateProjectType(id: number, body: ProjectTypeUpdatePayload): Promise<ProjectType> {
  const { data } = await api.patch<ApiEnvelope<ProjectType>>(PROJECT_TYPE_PATHS.detail(id), body);
  assertApiSuccess(data);
  return normalizeProjectType(data.data);
}

export async function deleteProjectType(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(PROJECT_TYPE_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
