import { fetchVendorTypeMock } from "@/features/vendor-types/api/vendor-type.mock";
import type {
  Vendor,
  VendorAddressPayload,
  VendorCreatePayload,
  VendorPagination,
  VendorTypeRef,
  VendorUpdatePayload,
} from "@/features/vendors/types/vendor.types";
import {
  allocateVendorAddressMockId,
  allocateVendorMockId,
  deleteVendorMockEntity,
  getVendorMockEntity,
  isVendorMockSeeded,
  listVendorMockEntities,
  markVendorMockSeeded,
  upsertVendorMockEntity,
} from "./vendor.mock-store";

const MOCK_USER = {
  id: 1,
  email: "admin@yopmail.com",
  username: "admin@123",
};

function nowIso() {
  return new Date().toISOString();
}

function paginate<T>(items: T[], page: number, pageSize: number): { slice: T[]; pagination: VendorPagination } {
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

function resolveVendorTypeRef(typeId: number): VendorTypeRef | null {
  const row = fetchVendorTypeMock(typeId);
  if (!row) return null;
  return { id: row.id, name: row.name, bg_color: row.bg_color, text_color: row.text_color };
}

function normalizeAddressesPayload(addresses: VendorAddressPayload[]) {
  const rows = addresses.map((addr) => ({
    id: allocateVendorAddressMockId(),
    address_type: addr.address_type ?? "other",
    address_line_1: addr.address_line_1.trim(),
    address_line_2: addr.address_line_2?.trim() || null,
    city: addr.city.trim(),
    state: addr.state.trim(),
    country: addr.country.trim(),
    pincode: addr.pincode.trim(),
    latitude: addr.latitude?.trim() || null,
    longitude: addr.longitude?.trim() || null,
    is_primary: Boolean(addr.is_primary),
  }));
  if (rows.length > 0 && !rows.some((a) => a.is_primary)) {
    rows[0]!.is_primary = true;
  }
  return rows;
}

export function seedVendorsMockIfEmpty() {
  if (isVendorMockSeeded()) return;
  const ts = nowIso();
  const typeRef = resolveVendorTypeRef(1);
  const vendor: Vendor = {
    id: 1,
    name: "SteelPeak Foundries",
    email: "r.henderson@steelpeak.com",
    phone: "+1 (555) 123-4567",
    type: typeRef,
    addresses: [
      {
        id: 1,
        address_type: "billing",
        address_line_1: "321 Ian Street",
        address_line_2: "Andheri West",
        city: "Tawang",
        state: "Arunachal Pradesh",
        country: "India",
        pincode: "400053",
        latitude: "27.5866",
        longitude: "91.8650",
        is_primary: true,
      },
      {
        id: 2,
        address_type: "shipping",
        address_line_1: "Plot No. 12",
        address_line_2: "Industrial Area",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pincode: "400001",
        latitude: "19.0760",
        longitude: "72.8777",
        is_primary: false,
      },
    ],
    is_active: true,
    created_at: ts,
    modified_at: ts,
    deleted_at: null,
    is_deleted: false,
    created_by: MOCK_USER,
    modified_by: MOCK_USER,
    deleted_by: null,
  };
  upsertVendorMockEntity(vendor);
  markVendorMockSeeded();
}

export type VendorListFilters = {
  search?: string;
  is_active?: boolean;
};

export function fetchVendorsPageMock(
  page = 1,
  pageSize = 20,
  filters?: VendorListFilters,
): { items: Vendor[]; pagination: VendorPagination } {
  seedVendorsMockIfEmpty();
  let items = listVendorMockEntities();
  const q = filters?.search?.trim().toLowerCase();
  if (q) {
    items = items.filter((row) => {
      const hay = [row.name, row.email, row.phone, ...row.addresses.map((a) => a.city)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }
  if (typeof filters?.is_active === "boolean") {
    items = items.filter((row) => row.is_active === filters.is_active);
  }
  const { slice, pagination } = paginate(items, page, pageSize);
  return { items: slice, pagination };
}

export function fetchVendorMock(id: number): Vendor | null {
  seedVendorsMockIfEmpty();
  return getVendorMockEntity(id);
}

export function createVendorMock(body: VendorCreatePayload): Vendor {
  seedVendorsMockIfEmpty();
  const ts = nowIso();
  const typeRef = resolveVendorTypeRef(body.type);
  const row: Vendor = {
    id: allocateVendorMockId(),
    name: body.name.trim(),
    email: body.email.trim(),
    phone: body.phone.trim(),
    type: typeRef ?? body.type,
    addresses: normalizeAddressesPayload(body.addresses),
    is_active: true,
    created_at: ts,
    modified_at: ts,
    deleted_at: null,
    is_deleted: false,
    created_by: MOCK_USER,
    modified_by: MOCK_USER,
    deleted_by: null,
  };
  upsertVendorMockEntity(row);
  return row;
}

export function updateVendorMock(id: number, body: VendorUpdatePayload): Vendor | null {
  seedVendorsMockIfEmpty();
  const existing = getVendorMockEntity(id);
  if (!existing) return null;
  const typeId = typeof body.type === "number" ? body.type : typeof existing.type === "number" ? existing.type : existing.type?.id;
  const typeRef = typeId ? resolveVendorTypeRef(typeId) : null;
  const row: Vendor = {
    ...existing,
    name: typeof body.name === "string" ? body.name.trim() : existing.name,
    email: typeof body.email === "string" ? body.email.trim() : existing.email,
    phone: typeof body.phone === "string" ? body.phone.trim() : existing.phone,
    type: typeRef ?? existing.type,
    addresses: body.addresses ? normalizeAddressesPayload(body.addresses) : existing.addresses,
    is_active: typeof body.is_active === "boolean" ? body.is_active : existing.is_active,
    modified_at: nowIso(),
    modified_by: MOCK_USER,
  };
  upsertVendorMockEntity(row);
  return row;
}

export function deleteVendorMock(id: number): boolean {
  seedVendorsMockIfEmpty();
  return deleteVendorMockEntity(id);
}
