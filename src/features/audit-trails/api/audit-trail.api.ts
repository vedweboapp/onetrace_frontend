import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import {
  applyDropdownListParam,
  DROPDOWN_LIST_PAGE_SIZE,
  resolveDropdownListPages,
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
  /**
   * Some modules (e.g. `sitemodel`) also scope by mass-action id.
   * Sent as a single id or comma-separated list.
   */
  mass_action_ids?: number | number[] | string;
  search?: string;
  action?: string;
  actor?: string | number;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
  dropdown?: boolean;
};

function normalizeMassActionIds(
  value: AuditTrailListFilters["mass_action_ids"],
): string | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return value > 0 ? String(value) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  const ids = value.filter((id) => Number.isFinite(id) && id > 0);
  return ids.length > 0 ? ids.join(",") : null;
}

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
  const massActionIds = normalizeMassActionIds(filters.mass_action_ids);
  if (massActionIds) params.mass_action_ids = massActionIds;
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
    // Never auto-walk pages here — settings panel paginates; entity timelines use one page.
    fetchFirst: async () => {
      const { data } = await api.get<AuditTrailListResponse>(AUDIT_TRAIL_PATHS.list, { params });
      return parseListApiPage(data, pageSize);
    },
  });
}

/** Load audit timeline for a module (optionally scoped to one record). One page only. */
export async function fetchAuditTrails(filters: AuditTrailListFilters): Promise<AuditTrailEntry[]> {
  const { items } = await fetchAuditTrailsPage(1, 50, { ...filters, dropdown: true });
  return items;
}
