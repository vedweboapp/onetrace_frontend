import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { INSTALLATION_TYPE_PATHS } from "./installation-type.paths";
import type {
  InstallationType,
  InstallationTypeCreatePayload,
  InstallationTypeListResponse,
  InstallationTypeUpdatePayload,
} from "../types/installation-type.types";
import { installationTypeNameFromRow } from "../utils/installation-type-display.util";

type InstallationTypeApiRow = InstallationType & {
  name?: string | null;
  bg_colour?: string | null;
  text_colour?: string | null;
};

/** Normalize API rows (legacy `name`, `bg_colour`, `text_colour` keys). */
function normalizeInstallationType(row: InstallationTypeApiRow): InstallationType {
  const bg = row.bg_color ?? row.bg_colour ?? "";
  const text = row.text_color ?? row.text_colour ?? "";
  return {
    ...row,
    installation_type: installationTypeNameFromRow(row),
    bg_color: bg,
    text_color: text,
  };
}

function toInstallationTypeWritePayload(
  body: InstallationTypeCreatePayload | InstallationTypeUpdatePayload,
): Record<string, unknown> {
  const src = body as InstallationTypeCreatePayload &
    InstallationTypeUpdatePayload & {
      bg_colour?: string;
      text_colour?: string;
    };
  const out: Record<string, unknown> = {};
  if (typeof src.installation_type === "string") out.installation_type = src.installation_type;
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

export type InstallationTypeListFilters = {
  search?: string;
  is_active?: boolean;
};

export async function fetchInstallationTypesPage(
  page = 1,
  pageSize = 20,
  filters?: InstallationTypeListFilters,
): Promise<{ items: InstallationType[]; pagination: InstallationTypeListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);

  const { data } = await api.get<InstallationTypeListResponse>(INSTALLATION_TYPE_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return {
    items: data.data.map((row) => normalizeInstallationType(row as InstallationTypeApiRow)),
    pagination: data.pagination,
  };
}

export async function fetchInstallationType(id: number): Promise<InstallationType> {
  const { data } = await api.get<ApiEnvelope<InstallationType>>(INSTALLATION_TYPE_PATHS.detail(id));
  assertApiSuccess(data);
  return normalizeInstallationType(data.data as InstallationTypeApiRow);
}

export async function createInstallationType(body: InstallationTypeCreatePayload): Promise<InstallationType> {
  const { data } = await api.post<ApiEnvelope<InstallationType>>(
    INSTALLATION_TYPE_PATHS.list,
    toInstallationTypeWritePayload(body),
  );
  assertApiSuccess(data);
  return normalizeInstallationType(data.data as InstallationTypeApiRow);
}

export async function updateInstallationType(
  id: number,
  body: InstallationTypeUpdatePayload,
): Promise<InstallationType> {
  const { data } = await api.patch<ApiEnvelope<InstallationType>>(
    INSTALLATION_TYPE_PATHS.detail(id),
    toInstallationTypeWritePayload(body),
  );
  assertApiSuccess(data);
  return normalizeInstallationType(data.data as InstallationTypeApiRow);
}

export async function deleteInstallationType(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(INSTALLATION_TYPE_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
