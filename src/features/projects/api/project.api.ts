import api from "@/core/api/axios";
import type { Job } from "@/features/jobs/types/job.types";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { PROJECT_PATHS } from "./project.paths";
import type {
  LocationToJobPayload,
  Project,
  ProjectCreatePayload,
  ProjectListResponse,
  ProjectUpdatePayload,
} from "../types/project.types";
import type { ProjectJobsHierarchyData, ProjectJobsHierarchyResponse } from "../types/project-jobs.types";
import { normalizeProjectJobsHierarchy } from "../utils/project-jobs-list.util";
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

export async function fetchAllProjectIds(filters?: ProjectListFilters): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchProjectsPage(page, pageSize, filters));
}

export async function fetchProject(id: number): Promise<Project> {
  const { data } = await api.get<ApiEnvelope<Project>>(PROJECT_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}
import type { Drawing } from "../types/drawing.types";

export async function fetchLocation(id: number | string): Promise<Drawing[]> {
  const { data } = await api.get<ApiEnvelope<Drawing[]>>(PROJECT_PATHS.projectLocation(id));
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
export async function createJobFromLocation(body: LocationToJobPayload): Promise<Job> {
  const { data } = await api.post<ApiEnvelope<Job>>(PROJECT_PATHS.createJobFromLocation, body);
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

type ProjectJobsRequestOptions = {
  silent?: boolean;
};

export async function fetchProjectJobsHierarchy(
  projectId: number,
  options?: ProjectJobsRequestOptions,
): Promise<ProjectJobsHierarchyData> {
  const { data } = await api.get<ProjectJobsHierarchyResponse>(PROJECT_PATHS.jobs(projectId), {
    skipErrorToast: options?.silent === true,
  });
  assertEnvelopeSuccess(data);
  return normalizeProjectJobsHierarchy(data.data ?? data);
}

export async function fetchProjectFormsPage(
  projectId: number,
  page = 1,
  pageSize = 500,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<{ items: FormListItem[]; pagination: FormsPagination }> {
  const { data } = await api.get(PROJECT_PATHS.projectFormsList(projectId), {
    params: { page, page_size: pageSize, ...params },
  });
  return {
    items: parseFormsListResponse(data),
    pagination: parseFormsPaginationResponse(data),
  };
}

export type ProjectMassUpdatePayload = {
  pin_ids: number[];
  form_id?: number | null;
  variation?: boolean;
  quantity?: number;
};

export async function massUpdatePins(
  projectId: number,
  payload: ProjectMassUpdatePayload,
): Promise<void> {
  const { data } = await api.post<ApiEnvelope<unknown>>(
    PROJECT_PATHS.massUpdate(projectId),
    payload,
  );
  assertApiSuccess(data);
}

