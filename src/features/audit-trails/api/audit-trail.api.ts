import api from "@/core/api/axios";
import { assertApiSuccess, type ApiEnvelope } from "@/core/types/api.types";
import {
  applyDropdownListParam,
  DROPDOWN_LIST_PAGE_SIZE,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
import { AUDIT_TRAIL_PATHS } from "./audit-trail.paths";
import type { AuditTrailEntry, AuditTrailListResponse } from "../types/audit-trail.types";

export type AuditTrailFilterOption = {
  value: string;
  label: string;
};

function humanizeFilterToken(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickTrimmedString(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/** Normalize `modules/names/` / `audit/actions/` rows into select options. */
function normalizeFilterOptions(raw: unknown): AuditTrailFilterOption[] {
  const envelope = asRecord(raw);
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray(envelope?.data)
      ? (envelope.data as unknown[])
      : Array.isArray(envelope?.results)
        ? (envelope.results as unknown[])
        : Array.isArray(envelope?.actions)
          ? (envelope.actions as unknown[])
          : Array.isArray(envelope?.modules)
            ? (envelope.modules as unknown[])
            : [];

  const seen = new Set<string>();
  const options: AuditTrailFilterOption[] = [];

  for (const row of list) {
    if (typeof row === "string") {
      const value = row.trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      options.push({ value, label: humanizeFilterToken(value) });
      continue;
    }

    const rec = asRecord(row);
    if (!rec) continue;

    const value = pickTrimmedString(
      rec.value,
      rec.api_name,
      rec.module,
      rec.action,
      rec.name,
      rec.key,
      rec.code,
      rec.slug,
    );
    if (!value || seen.has(value)) continue;

    const label =
      pickTrimmedString(rec.label, rec.singular_label, rec.display_name, rec.title) ??
      humanizeFilterToken(value);

    seen.add(value);
    options.push({ value, label });
  }

  return options;
}

async function fetchAuditFilterOptions(path: string): Promise<AuditTrailFilterOption[]> {
  const { data } = await api.get<ApiEnvelope<unknown> | unknown>(path, {
    skipErrorToast: true,
  });
  const envelope = asRecord(data);
  if (envelope && typeof envelope.success === "boolean") {
    assertApiSuccess(envelope as ApiEnvelope<unknown>);
  }
  return normalizeFilterOptions(data);
}

/** Settings Audit Logs — module filter options (`GET modules/names/`). */
export async function fetchAuditModuleNameOptions(): Promise<AuditTrailFilterOption[]> {
  return fetchAuditFilterOptions(AUDIT_TRAIL_PATHS.moduleNames);
}

/** Settings Audit Logs — action filter options (`GET audit/actions/`). */
export async function fetchAuditActionOptions(): Promise<AuditTrailFilterOption[]> {
  return fetchAuditFilterOptions(AUDIT_TRAIL_PATHS.actions);
}

export type AuditTrailListFilters = {
  /** Required for record timelines; optional for Settings “all logs” view. */
  module?: string;
  object_id?: number;
  /** Optional mass-action scope (single id or comma-separated list). */
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
