import { REJECTION_REASON_PATHS } from "@/features/rejection-reasons/api/rejection-reason.paths";
import type {
  RejectionReason,
  RejectionReasonCreatePayload,
  RejectionReasonListResponse,
  RejectionReasonUpdatePayload,
} from "@/features/rejection-reasons/types/rejection-reason.types";
import { emitMockApiNetworkRequest } from "@/shared/config/mock-api-network.util";

type RejectionReasonListFilters = {
  search?: string;
  is_active?: boolean;
};

const STORAGE_KEY = "onetrace_mock_rejection_reasons_v1";

const DEFAULT_ROWS: Array<Pick<RejectionReason, "name" | "is_active" | "is_system_generated">> = [
  { name: "Incomplete work", is_active: true, is_system_generated: false },
  { name: "Quality issue", is_active: true, is_system_generated: false },
  { name: "Customer cancelled", is_active: false, is_system_generated: false },
];

function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toWritePayload(
  body: RejectionReasonCreatePayload | RejectionReasonUpdatePayload,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.name === "string") out.name = body.name;
  if ("is_active" in body && typeof body.is_active === "boolean") {
    out.is_active = body.is_active;
  }
  return out;
}

function readAll(): RejectionReason[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDefaults();
    const parsed = JSON.parse(raw) as RejectionReason[];
    return Array.isArray(parsed) ? parsed : seedDefaults();
  } catch {
    return seedDefaults();
  }
}

function seedDefaults(): RejectionReason[] {
  const now = new Date().toISOString();
  return DEFAULT_ROWS.map((row, index) => ({
    id: index + 1,
    created_by: null,
    modified_by: null,
    created_at: now,
    modified_at: now,
    deleted_at: null,
    is_deleted: false,
    name: row.name,
    is_system_generated: row.is_system_generated,
    is_active: row.is_active,
    deleted_by: null,
    organization: null,
  }));
}

function writeAll(rows: RejectionReason[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function nextId(rows: RejectionReason[]): number {
  const max = rows.reduce((m, r) => Math.max(m, r.id), 0);
  return max + 1;
}

function paginate(
  rows: RejectionReason[],
  page: number,
  pageSize: number,
): { items: RejectionReason[]; pagination: RejectionReasonListResponse["pagination"] } {
  const total_records = rows.length;
  const total_pages = Math.max(1, Math.ceil(total_records / pageSize));
  const current_page = Math.min(Math.max(1, page), total_pages);
  const start = (current_page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    pagination: {
      total_records,
      total_pages,
      current_page,
      page_size: pageSize,
      next: current_page < total_pages ? String(current_page + 1) : null,
      previous: current_page > 1 ? String(current_page - 1) : null,
    },
  };
}

export async function fetchRejectionReasonsPage(
  page = 1,
  pageSize = 20,
  filters?: RejectionReasonListFilters,
): Promise<{ items: RejectionReason[]; pagination: RejectionReasonListResponse["pagination"] }> {
  await emitMockApiNetworkRequest({
    method: "get",
    path: REJECTION_REASON_PATHS.list,
    params: {
      page,
      page_size: pageSize,
      search: filters?.search?.trim() || undefined,
      is_active: typeof filters?.is_active === "boolean" ? String(filters.is_active) : undefined,
    },
  });
  await delay();
  let rows = readAll();
  const q = filters?.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => row.name.toLowerCase().includes(q));
  }
  if (typeof filters?.is_active === "boolean") {
    rows = rows.filter((row) => row.is_active === filters.is_active);
  }
  rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  return paginate(rows, page, pageSize);
}

export async function fetchRejectionReason(id: number): Promise<RejectionReason> {
  await emitMockApiNetworkRequest({ method: "get", path: REJECTION_REASON_PATHS.detail(id) });
  await delay(80);
  const row = readAll().find((r) => r.id === id);
  if (!row) throw new Error("Rejection reason not found");
  return row;
}

export async function createRejectionReason(body: RejectionReasonCreatePayload): Promise<RejectionReason> {
  await emitMockApiNetworkRequest({
    method: "post",
    path: REJECTION_REASON_PATHS.list,
    data: toWritePayload(body),
  });
  await delay(180);
  const rows = readAll();
  const now = new Date().toISOString();
  const row: RejectionReason = {
    id: nextId(rows),
    created_by: null,
    modified_by: null,
    created_at: now,
    modified_at: now,
    deleted_at: null,
    is_deleted: false,
    name: body.name.trim(),
    is_system_generated: false,
    is_active: true,
    deleted_by: null,
    organization: null,
  };
  writeAll([...rows, row]);
  return row;
}

export async function updateRejectionReason(
  id: number,
  body: RejectionReasonUpdatePayload,
): Promise<RejectionReason> {
  await emitMockApiNetworkRequest({
    method: "patch",
    path: REJECTION_REASON_PATHS.detail(id),
    data: toWritePayload(body),
  });
  await delay(150);
  const rows = readAll();
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error("Rejection reason not found");
  const current = rows[index]!;
  const updated: RejectionReason = {
    ...current,
    name: typeof body.name === "string" ? body.name.trim() : current.name,
    is_active: typeof body.is_active === "boolean" ? body.is_active : current.is_active,
    modified_at: new Date().toISOString(),
  };
  const next = [...rows];
  next[index] = updated;
  writeAll(next);
  return updated;
}

export async function deleteRejectionReason(id: number): Promise<void> {
  await emitMockApiNetworkRequest({ method: "delete", path: REJECTION_REASON_PATHS.detail(id) });
  await delay(120);
  writeAll(readAll().filter((r) => r.id !== id));
}
