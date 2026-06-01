import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { PROJECT_PATHS } from "./project.paths";
import type {
  Project,
  ProjectCreatePayload,
  ProjectListResponse,
  ProjectUpdatePayload,
} from "../types/project.types";
import type { FormListItem, FormsPagination } from "@/features/forms/types/form.types";
import {
  parseFormsListResponse,
  parseFormsPaginationResponse,
} from "@/features/forms/utils/parse-forms-list.util";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type ProjectListFilters = {
  search?: string;
  is_active?: boolean;
  client?: number;
};

export async function fetchProjectsPage(
  page = 1,
  pageSize = 20,
  filters?: ProjectListFilters,
): Promise<{ items: Project[]; pagination: ProjectListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = {
    page,
    page_size: pageSize,
  };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (filters?.is_active === true) params.is_active = true;
  if (filters?.is_active === false) params.is_active = false;
  if (typeof filters?.client === "number" && Number.isFinite(filters.client) && filters.client > 0) {
    params.client = filters.client;
  }

  const { data } = await api.get<ProjectListResponse>(PROJECT_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchProject(id: number): Promise<Project> {
  const { data } = await api.get<ApiEnvelope<Project>>(PROJECT_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createProject(body: ProjectCreatePayload): Promise<Project> {
  const { data } = await api.post<ApiEnvelope<Project>>(PROJECT_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateProject(id: number, body: ProjectUpdatePayload): Promise<Project> {
  const { data } = await api.patch<ApiEnvelope<Project>>(PROJECT_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function patchProject(id: number, body: { is_active: boolean }): Promise<Project> {
  const { data } = await api.patch<ApiEnvelope<Project>>(PROJECT_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteProject(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(PROJECT_PATHS.detail(id));
  assertApiSuccess(data);
}

export async function fetchProjectFormsPage(
  projectId: number,
  page = 1,
  pageSize = 500,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<{ items: FormListItem[]; pagination: FormsPagination }> {
  const { data } = await api.get(PROJECT_PATHS.projectForms(projectId), {
    params: { page, page_size: pageSize, ...params },
  });
  return {
    items: parseFormsListResponse(data),
    pagination: parseFormsPaginationResponse(data),
  };
}
