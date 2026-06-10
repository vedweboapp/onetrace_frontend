import type {
  VendorType,
  VendorTypeCreatePayload,
  VendorTypePagination,
  VendorTypeUpdatePayload,
} from "@/features/vendor-types/types/vendor-type.types";
import {
  allocateVendorTypeMockId,
  deleteVendorTypeMockEntity,
  getVendorTypeMockEntity,
  isVendorTypeMockSeeded,
  listVendorTypeMockEntities,
  markVendorTypeMockSeeded,
  upsertVendorTypeMockEntity,
} from "./vendor-type.mock-store";

const MOCK_USER = {
  id: 1,
  email: "admin@yopmail.com",
  username: "admin@123",
};

function nowIso() {
  return new Date().toISOString();
}

function paginate<T>(items: T[], page: number, pageSize: number): { slice: T[]; pagination: VendorTypePagination } {
  const total = items.length;
  const total_pages = Math.max(1, Math.ceil(total / pageSize));
  const current_page = Math.min(Math.max(1, page), total_pages);
  const start = (current_page - 1) * pageSize;
  return {
    slice: items.slice(start, start + pageSize),
    pagination: {
      total_records: total,
      total_pages,
      current_page,
      page_size: pageSize,
      next: current_page < total_pages ? String(current_page + 1) : null,
      previous: current_page > 1 ? String(current_page - 1) : null,
    },
  };
}

export function seedVendorTypesMockIfEmpty() {
  if (isVendorTypeMockSeeded()) return;
  const ts = nowIso();
  const seeds: VendorType[] = [
    {
      id: 1,
      name: "Raw Material",
      bg_color: "#FEF3C7",
      text_color: "#92400E",
      is_active: true,
      created_at: ts,
      modified_at: ts,
      deleted_at: null,
      is_deleted: false,
      deleted_by: null,
      created_by: MOCK_USER,
      modified_by: MOCK_USER,
    },
    {
      id: 2,
      name: "Transport",
      bg_color: "#DBEAFE",
      text_color: "#1E40AF",
      is_active: true,
      created_at: ts,
      modified_at: ts,
      deleted_at: null,
      is_deleted: false,
      deleted_by: null,
      created_by: MOCK_USER,
      modified_by: MOCK_USER,
    },
  ];
  for (const row of seeds) upsertVendorTypeMockEntity(row);
  markVendorTypeMockSeeded();
}

export type VendorTypeListFilters = {
  search?: string;
  is_active?: boolean;
};

export function fetchVendorTypesPageMock(
  page = 1,
  pageSize = 20,
  filters?: VendorTypeListFilters,
): { items: VendorType[]; pagination: VendorTypePagination } {
  seedVendorTypesMockIfEmpty();
  let items = listVendorTypeMockEntities();
  const q = filters?.search?.trim().toLowerCase();
  if (q) items = items.filter((row) => row.name.toLowerCase().includes(q));
  if (typeof filters?.is_active === "boolean") {
    items = items.filter((row) => row.is_active === filters.is_active);
  }
  items = [...items].sort((a, b) => b.id - a.id);
  const { slice, pagination } = paginate(items, page, pageSize);
  return { items: slice, pagination };
}

export function fetchVendorTypeMock(id: number): VendorType | null {
  seedVendorTypesMockIfEmpty();
  return getVendorTypeMockEntity(id);
}

export function createVendorTypeMock(body: VendorTypeCreatePayload): VendorType {
  seedVendorTypesMockIfEmpty();
  const ts = nowIso();
  const row: VendorType = {
    id: allocateVendorTypeMockId(),
    name: body.name.trim(),
    bg_color: body.bg_color,
    text_color: body.text_color,
    is_active: true,
    created_at: ts,
    modified_at: ts,
    deleted_at: null,
    is_deleted: false,
    deleted_by: null,
    created_by: MOCK_USER,
    modified_by: MOCK_USER,
  };
  upsertVendorTypeMockEntity(row);
  return row;
}

export function updateVendorTypeMock(id: number, body: VendorTypeUpdatePayload): VendorType | null {
  seedVendorTypesMockIfEmpty();
  const existing = getVendorTypeMockEntity(id);
  if (!existing) return null;
  const row: VendorType = {
    ...existing,
    name: typeof body.name === "string" ? body.name.trim() : existing.name,
    bg_color: body.bg_color ?? existing.bg_color,
    text_color: body.text_color ?? existing.text_color,
    is_active: typeof body.is_active === "boolean" ? body.is_active : existing.is_active,
    modified_at: nowIso(),
    modified_by: MOCK_USER,
  };
  upsertVendorTypeMockEntity(row);
  return row;
}

export function deleteVendorTypeMock(id: number): boolean {
  seedVendorTypesMockIfEmpty();
  return deleteVendorTypeMockEntity(id);
}
