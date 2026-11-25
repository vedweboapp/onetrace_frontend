import api from "@/core/api/axios";
import type { Job } from "@/features/jobs/types/job.types";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import type { EntityAttachmentWriteRef } from "@/shared/attachments/entity-attachment.types";
import { updateEntityAttachments } from "@/shared/attachments/update-entity-attachments.util";
import {
  applyDropdownListParam,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
import { PROJECT_PATHS } from "./project.paths";
import type {
  LocationToJobPayload,
  Project,
  ProjectCreatePayload,
  ProjectListResponse,
  ProjectUpdatePayload,
  ProjectUpsertPayload,
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
  dropdown?: boolean;
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
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    fetchFirst: async () => {
      const { data } = await api.get<ProjectListResponse>(PROJECT_PATHS.list, { params });
      return parseListApiPage(data, pageSize);
    },
  });
}

export async function fetchAllProjectIds(filters?: ProjectListFilters): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchProjectsPage(page, pageSize, filters));
}

export async function fetchProject(id: number): Promise<Project> {
  const { data } = await api.get<ApiEnvelope<Project>>(PROJECT_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

/** GET project/{id}/approved-vendor-quotations/ */
export async function fetchProjectApprovedVendorQuotations(projectId: number): Promise<unknown> {
  const { data } = await api.get(PROJECT_PATHS.approvedVendorQuotations(projectId), {
    skipErrorToast: true,
  });
  return data;
}

import type { Drawing } from "../types/drawing.types";

export async function fetchLocation(id: number | string): Promise<Drawing[]> {
  const { data } = await api.get<ApiEnvelope<Drawing[]>>(PROJECT_PATHS.projectLocation(id));
  assertApiSuccess(data);
  return data.data;
}

export function buildProjectFormData(body: ProjectUpsertPayload): FormData {
  const fd = new FormData();
  const jsonPayload: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(body)) {
    if (val === undefined) continue;
    if (key === "project_image") {
      if (val instanceof File) {
        fd.append("project_image", val, val.name);
      } else if (val === null) {
        fd.append("project_image", "null");
      }
      continue;
    }
    jsonPayload[key] = val;
  }
  fd.append("JSONString", JSON.stringify(jsonPayload));
  return fd;
}

export async function createProject(body: ProjectCreatePayload): Promise<Project> {
  let submitData: ProjectCreatePayload | FormData = body;
  if (body.project_image instanceof File) {
    submitData = buildProjectFormData(body);
  } else {
    const cleanBody = { ...body };
    if (typeof cleanBody.project_image === "string") {
      delete cleanBody.project_image;
    }
    submitData = cleanBody;
  }
  const { data } = await api.post<ApiEnvelope<Project>>(PROJECT_PATHS.list, submitData);
  assertApiSuccess(data);
  return data.data;
}

export async function updateProject(id: number, body: ProjectUpdatePayload): Promise<Project> {
  const cleanBody = { ...body };
  if (typeof cleanBody.project_image === "string") {
    delete cleanBody.project_image;
  }
  const submitData = buildProjectFormData(cleanBody as ProjectUpsertPayload);
  const { data } = await api.patch<ApiEnvelope<Project>>(PROJECT_PATHS.detail(id), submitData);
  assertApiSuccess(data);
  return data.data;
}

import type { ProjectFolder } from "@/features/projects/types/project-folder.types";

export async function fetchProjectFolders(id: number): Promise<ProjectFolder[]> {
  try {
    const { data } = await api.get<ApiEnvelope<ProjectFolder[]> | ProjectFolder[]>(PROJECT_PATHS.folders(id));
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "data" in data && Array.isArray(data.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

export async function createProjectFolder(entityId: number, name: string): Promise<ProjectFolder> {
  const { data } = await api.post<ApiEnvelope<ProjectFolder> | ProjectFolder>(PROJECT_PATHS.folders(entityId), { name });
  if (data && typeof data === "object" && "data" in data && data.data) return data.data;
  return data as ProjectFolder;
}

export async function updateProjectFolder(entityId: number, folderId: number, name: string): Promise<ProjectFolder> {
  const { data } = await api.patch<ApiEnvelope<ProjectFolder> | ProjectFolder>(PROJECT_PATHS.folderDetail(entityId, folderId), { name });
  if (data && typeof data === "object" && "data" in data && data.data) return data.data;
  return data as ProjectFolder;
}

export async function deleteProjectFolder(entityId: number, folderId: number): Promise<void> {
  await api.delete(PROJECT_PATHS.folderDetail(entityId, folderId));
}

export async function updateProjectAttachments(
  id: number,
  refs: EntityAttachmentWriteRef[],
  options?: { folderId?: number | null },
): Promise<Project> {
  return updateEntityAttachments<Project>(PROJECT_PATHS.detail(id), refs, options);
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
  const { dropdown, ...rest } = params ?? {};
  const requestParams: Record<string, string | number | boolean> = {
    page,
    page_size: pageSize,
  };
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) requestParams[key] = value;
  }
  applyDropdownListParam(requestParams, dropdown === true);

  return resolveDropdownListPages({
    dropdown: dropdown === true,
    fetchFirst: async () => {
      const { data } = await api.get(PROJECT_PATHS.projectFormsList(projectId), {
        params: requestParams,
      });
      return {
        items: parseFormsListResponse(data),
        pagination: parseFormsPaginationResponse(data),
      };
    },
  });
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

