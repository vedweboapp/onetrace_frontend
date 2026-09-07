import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import { assertApiSuccess } from "@/core/types/api.types";
import { AUDIT_TRAIL_PATHS } from "./audit-trail.paths";
import type { AuditTrailEntry, AuditTrailListResponse } from "../types/audit-trail.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type AuditTrailListFilters = {
  module: string;
  object_id?: number;
  page?: number;
  page_size?: number;
};

export async function fetchAuditTrailsPage(
  page = 1,
  pageSize = 100,
  filters: AuditTrailListFilters,
): Promise<{ items: AuditTrailEntry[]; pagination: AuditTrailListResponse["pagination"] }> {
  const params: Record<string, string | number> = {
    page,
    page_size: pageSize,
    module: filters.module.trim(),
  };
  if (filters.object_id != null && filters.object_id > 0) {
    params.object_id = filters.object_id;
  }

  const { data } = await api.get<AuditTrailListResponse>(AUDIT_TRAIL_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  const items = Array.isArray(data.data) ? data.data : [];
  return { items, pagination: data.pagination };
}

/** Load audit trails for a module (optionally scoped to one record). */
export async function fetchAuditTrails(filters: AuditTrailListFilters): Promise<AuditTrailEntry[]> {
  const { items } = await fetchAuditTrailsPage(1, 500, filters);
  return items;
}
