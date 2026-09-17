import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import {
  applyDropdownListParam,
  DROPDOWN_LIST_PAGE_SIZE,
  resolveDropdownListPages,
  unwrapListPayload,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
import { AUDIT_TRAIL_PATHS } from "./audit-trail.paths";
import type { AuditTrailEntry, AuditTrailListResponse } from "../types/audit-trail.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type AuditTrailListFilters = {
  /** Required for record timelines; optional for Settings “all logs” view. */
  module?: string;
  object_id?: number;
  search?: string;
  action?: string;
  actor?: string | number;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
  dropdown?: boolean;
};

export async function fetchAuditTrailsPage(
  page = 1,
  pageSize = DROPDOWN_LIST_PAGE_SIZE,
  filters: AuditTrailListFilters = {},
): Promise<{ items: AuditTrailEntry[]; pagination: NonNullable<AuditTrailListResponse["pagination"]> }> {
  const params: Record<string, string | number | boolean> = {
    page,
    page_size: pageSize,
  };
  const module = filters.module?.trim();
  if (module) params.module = module;
  if (filters.object_id != null && filters.object_id > 0) {
    params.object_id = filters.object_id;
  }
  const search = filters.search?.trim();
  if (search) params.search = search;
  const action = filters.action?.trim();
  if (action) params.action = action;
  if (filters.actor != null && String(filters.actor).trim()) {
    params.actor = filters.actor;
  }
  if (filters.from?.trim()) params.from = filters.from.trim();
  if (filters.to?.trim()) params.to = filters.to.trim();
  applyDropdownListParam(params, filters.dropdown);

  return resolveDropdownListPages({
    dropdown: filters.dropdown,
    fetchFirst: async () => {
      const { data } = await api.get<AuditTrailListResponse>(AUDIT_TRAIL_PATHS.list, { params });
      return parseListApiPage(data, pageSize);
    },
  });
}

/** Load full audit timeline for a module (optionally scoped to one record). */
export async function fetchAuditTrails(filters: AuditTrailListFilters): Promise<AuditTrailEntry[]> {
  const { items } = await fetchAuditTrailsPage(1, DROPDOWN_LIST_PAGE_SIZE, { ...filters, dropdown: true });
  return items;
}
