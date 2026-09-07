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

type ProjectTypeApiRow = ProjectType & {
  name?: string | null;
  bg_colour?: string | null;
  text_colour?: string | null;
};

/** Normalize API rows (legacy `name`, `bg_colour`, `text_colour` keys). */
function normalizeProjectType(row: ProjectTypeApiRow): ProjectType {
  const bg = row.bg_color ?? row.bg_colour ?? "";
  const text = row.text_color ?? row.text_colour ?? "";
  return {
    ...row,
    project_type: projectTypeNameFromRow(row),
    bg_color: bg,
    text_color: text,
  };
}

function toProjectTypeWritePayload(
  body: ProjectTypeCreatePayload | ProjectTypeUpdatePayload,
): Record<string, unknown> {
  const src = body as ProjectTypeCreatePayload &
    ProjectTypeUpdatePayload & {
      bg_colour?: string;
      text_colour?: string;
    };
  const out: Record<string, unknown> = {};
  if (typeof src.project_type === "string") out.project_type = src.project_type;
  if (typeof src.is_active === "boolean") out.is_active = src.is_active;
  const bg = src.bg_color ?? src.bg_colour;
  const text = src.text_color ?? src.text_colour;
  if (typeof bg === "string") out.bg_color = bg;
  if (typeof text === "string") out.text_color = text;
  return out;
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
  return { items: data.data.map((row) => normalizeProjectType(row as ProjectTypeApiRow)), pagination: data.pagination };
}

export async function fetchProjectType(id: number): Promise<ProjectType> {
  const { data } = await api.get<ApiEnvelope<ProjectType>>(PROJECT_TYPE_PATHS.detail(id));
  assertApiSuccess(data);
  return normalizeProjectType(data.data as ProjectTypeApiRow);
}

export async function createProjectType(body: ProjectTypeCreatePayload): Promise<ProjectType> {
  const { data } = await api.post<ApiEnvelope<ProjectType>>(PROJECT_TYPE_PATHS.list, toProjectTypeWritePayload(body));
  assertApiSuccess(data);
  return normalizeProjectType(data.data as ProjectTypeApiRow);
}

export async function updateProjectType(id: number, body: ProjectTypeUpdatePayload): Promise<ProjectType> {
  const { data } = await api.patch<ApiEnvelope<ProjectType>>(
    PROJECT_TYPE_PATHS.detail(id),
    toProjectTypeWritePayload(body),
  );
  assertApiSuccess(data);
  return normalizeProjectType(data.data as ProjectTypeApiRow);
}

export async function deleteProjectType(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(PROJECT_TYPE_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
