import type {
  WorkflowColourStatus,
  WorkflowColourStatusCreatePayload,
  WorkflowColourStatusPagination,
  WorkflowColourStatusUpdatePayload,
} from "@/shared/types/workflow-colour-status.types";
import {
  allocateMaterialStatusMockId,
  deleteMaterialStatusMockEntity,
  getMaterialStatusMockEntity,
  listMaterialStatusMockEntities,
  upsertMaterialStatusMockEntity,
} from "./material-status.mock-store";

export type MaterialStatusListFilters = {
  search?: string;
  is_active?: boolean;
  page?: number;
  pageSize?: number;
};

const DEFAULT_USER = {
  id: 1,
  email: "admin@yopmail.com",
  username: "admin",
};

function paginate<T>(rows: T[], page: number, pageSize: number): { slice: T[]; pagination: WorkflowColourStatusPagination } {
  const total_records = rows.length;
  const total_pages = Math.max(1, Math.ceil(total_records / pageSize) || 1);
  const current_page = Math.min(Math.max(1, page), total_pages);
  const start = (current_page - 1) * pageSize;
  return {
    slice: rows.slice(start, start + pageSize),
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

function matchesFilters(row: WorkflowColourStatus, filters?: MaterialStatusListFilters): boolean {
  if (!filters) return true;
  const q = filters.search?.trim().toLowerCase();
  if (q && !row.status_name.toLowerCase().includes(q)) return false;
  if (filters.is_active === true && row.is_active === false) return false;
  if (filters.is_active === false && row.is_active !== false) return false;
  return true;
}

export async function fetchMaterialStatusesPageMock(
  page = 1,
  pageSize = 20,
  filters?: MaterialStatusListFilters,
): Promise<{ items: WorkflowColourStatus[]; pagination: WorkflowColourStatusPagination }> {
  const all = listMaterialStatusMockEntities().filter((row) => matchesFilters(row, filters));
  const { slice, pagination } = paginate(all, page, pageSize);
  return { items: slice, pagination };
}

export async function fetchMaterialStatusMock(id: number): Promise<WorkflowColourStatus | null> {
  return getMaterialStatusMockEntity(id);
}

export async function createMaterialStatusMock(
  body: WorkflowColourStatusCreatePayload,
): Promise<WorkflowColourStatus> {
  const id = allocateMaterialStatusMockId();
  const now = new Date().toISOString();
  const row: WorkflowColourStatus = {
    id,
    created_by: DEFAULT_USER,
    modified_by: null,
    created_at: now,
    modified_at: now,
    deleted_at: null,
    is_deleted: false,
    is_active: true,
    deleted_by: null,
    organization: 1,
    status_name: body.status_name.trim(),
    bg_colour: body.bg_colour.trim(),
    text_colour: body.text_colour.trim(),
  };
  upsertMaterialStatusMockEntity(row);
  return row;
}

export async function updateMaterialStatusMock(
  id: number,
  body: WorkflowColourStatusUpdatePayload,
): Promise<WorkflowColourStatus> {
  const existing = getMaterialStatusMockEntity(id);
  if (!existing) throw new Error(`Material status ${id} not found`);

  const row: WorkflowColourStatus = {
    ...existing,
    status_name: body.status_name?.trim() ?? existing.status_name,
    bg_colour: body.bg_colour?.trim() ?? existing.bg_colour,
    text_colour: body.text_colour?.trim() ?? existing.text_colour,
    modified_at: new Date().toISOString(),
    modified_by: DEFAULT_USER,
  };
  upsertMaterialStatusMockEntity(row);
  return row;
}

export async function deleteMaterialStatusMock(id: number): Promise<void> {
  const ok = deleteMaterialStatusMockEntity(id);
  if (!ok) throw new Error(`Material status ${id} not found`);
}
