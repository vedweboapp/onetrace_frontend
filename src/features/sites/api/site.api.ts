import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { SITE_PATHS } from "./site.paths";
import type {
  Site,
  SiteCreatePayload,
  SiteListResponse,
  SiteUpdatePayload,
} from "../types/site.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type SiteListFilters = {
  search?: string;
  is_active?: boolean;
  client?: number;
};

export async function fetchSitesPage(
  page = 1,
  pageSize = 20,
  filters?: SiteListFilters,
): Promise<{ items: Site[]; pagination: SiteListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);
  if (typeof filters?.client === "number" && Number.isFinite(filters.client) && filters.client > 0) {
    params.client = filters.client;
  }
  const { data } = await api.get<SiteListResponse>(SITE_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchSite(id: number): Promise<Site> {
  const { data } = await api.get<ApiEnvelope<Site>>(SITE_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createSite(body: SiteCreatePayload): Promise<Site> {
  const { data } = await api.post<ApiEnvelope<Site>>(SITE_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateSite(id: number, body: SiteUpdatePayload): Promise<Site> {
  const { data } = await api.patch<ApiEnvelope<Site>>(SITE_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function patchSite(id: number, body: { is_active: boolean }): Promise<Site> {
  const { data } = await api.patch<ApiEnvelope<Site>>(SITE_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteSite(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(SITE_PATHS.detail(id));
  assertApiSuccess(data);
}
