import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { QUOTATION_PATHS } from "./quotation.paths";
import type {
  QuotationCreatePayload,
  QuotationDetail,
  QuotationListItem,
  QuotationListResponse,
  QuotationLevelRef,
  WorkspaceUserRow,
} from "../types/quotation.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type QuotationListFilters = {
  search?: string;
  is_active?: boolean;
  customer?: number;
  site?: number;
  project?: number;
  status?: string;
};

export async function fetchQuotationsPage(
  page = 1,
  pageSize = 20,
  filters?: QuotationListFilters,
): Promise<{ items: QuotationListItem[]; pagination: QuotationListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = {
    page,
    page_size: pageSize,
  };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = filters.is_active;
  if (typeof filters?.customer === "number" && filters.customer > 0) params.customer = filters.customer;
  if (typeof filters?.site === "number" && filters.site > 0) params.site = filters.site;
  if (typeof filters?.project === "number" && filters.project > 0) params.project = filters.project;
  if (filters?.status?.trim()) params.status = filters.status.trim();

  const { data } = await api.get<QuotationListResponse>(QUOTATION_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchQuotation(id: number): Promise<QuotationDetail> {
  const { data } = await api.get<ApiEnvelope<QuotationDetail>>(QUOTATION_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createQuotation(body: QuotationCreatePayload): Promise<QuotationDetail> {
  const { data } = await api.post<ApiEnvelope<QuotationDetail>>(QUOTATION_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

/** Loads selectable levels for a project when composing a quotation. */
export async function fetchProjectLevelsForQuotation(projectId: number): Promise<QuotationLevelRef[]> {
  try {
    const { data } = await api.get<ApiEnvelope<QuotationLevelRef[]>>(
      QUOTATION_PATHS.projectLevels(projectId),
      { skipErrorToast: true },
    );
    assertApiSuccess(data);
    return Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}

/** Optional; used to populate user role dropdowns when the route exists. */
export async function fetchWorkspaceUsers(): Promise<WorkspaceUserRow[]> {
  try {
    const { data } = await api.get<{ success: boolean; data: WorkspaceUserRow[] }>("users/", {
      params: { page_size: 500 },
      skipErrorToast: true,
    });
    if (data?.success && Array.isArray(data.data)) return data.data;
  } catch {
    /* route may be absent or named differently on the API */
  }
  return [];
}
