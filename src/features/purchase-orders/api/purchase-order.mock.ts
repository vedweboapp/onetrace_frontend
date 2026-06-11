import { fetchVendorMock } from "@/features/vendors/api/vendor.mock";
import type {
  PurchaseOrderCompositeItem,
  PurchaseOrderCompositeItemPayload,
  PurchaseOrderCreatePayload,
  PurchaseOrderDetail,
  PurchaseOrderListItem,
  PurchaseOrderPagination,
  PurchaseOrderUpdatePayload,
  PurchaseOrderVendorRef,
} from "@/features/purchase-orders/types/purchase-order.types";
import {
  allocatePurchaseOrderMockId,
  deletePurchaseOrderMockEntity,
  getPurchaseOrderMockEntity,
  isPurchaseOrderMockSeeded,
  listPurchaseOrderMockEntities,
  markPurchaseOrderMockSeeded,
  upsertPurchaseOrderMockEntity,
} from "./purchase-order.mock-store";

const MOCK_USER = {
  id: 1,
  email: "admin@yopmail.com",
  username: "admin@123",
};

const PAYMENT_TERM_LABELS: Record<string, string> = {
  net_7: "Net 7 Days",
  net_15: "Net 15 Days",
  net_30: "Net 30 Days",
  net_45: "Net 45 Days",
  due_on_receipt: "Due on Receipt",
};

function nowIso() {
  return new Date().toISOString();
}

function todayDateOnly() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatPoNumber(id: number): string {
  const year = new Date().getFullYear();
  return `PO-${year}-${String(id).padStart(3, "0")}`;
}

function paymentTermsLabel(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  const key = trimmed.toLowerCase();
  return PAYMENT_TERM_LABELS[key] ?? trimmed;
}

function paginate<T>(items: T[], page: number, pageSize: number): { slice: T[]; pagination: PurchaseOrderPagination } {
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

function resolveVendorRef(vendorId: number): PurchaseOrderVendorRef {
  const row = fetchVendorMock(vendorId);
  if (row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
    };
  }
  return { id: vendorId, name: `Vendor #${vendorId}` };
}

function normalizeCompositeItems(items: PurchaseOrderCompositeItemPayload[]): PurchaseOrderCompositeItem[] {
  return items.map((row) => {
    const qty = row.quantity > 0 ? row.quantity : 1;
    const amount = row.amount ?? 0;
    const lineTotal = amount > 0 ? amount : qty * amount;
    return {
      id: row.id,
      name: row.name,
      group: row.group ?? null,
      quantity: qty,
      amount,
      line_total: lineTotal,
      item: {
        id: row.id,
        name: row.name ?? `Item #${row.id}`,
        selling_price: qty > 0 && amount > 0 ? amount / qty : amount,
      },
    };
  });
}

function coerceNumber(value: number | string | null | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function computeTotal(items: PurchaseOrderCompositeItem[], fallback?: number | string | null): number {
  const fallbackNum = coerceNumber(fallback);
  if (fallbackNum != null && fallbackNum > 0) return fallbackNum;
  return items.reduce((sum, row) => {
    const line =
      row.amount != null && Number.isFinite(row.amount)
        ? row.amount
        : typeof row.line_total === "number"
          ? row.line_total
          : Number.parseFloat(String(row.line_total ?? "0"));
    return sum + (Number.isFinite(line) ? line : 0);
  }, 0);
}

function toListItem(detail: PurchaseOrderDetail): PurchaseOrderListItem {
  const total = computeTotal(detail.composite_items ?? [], detail.total ?? undefined);
  return {
    id: detail.id,
    purchase_order_number: detail.purchase_order_number,
    vendor: detail.vendor,
    project: detail.project,
    project_name: detail.project_name,
    sub_total: String(total.toFixed(2)),
    adjustment_amount: "0.00",
    total_balance: String(total.toFixed(2)),
    total,
    issue_date: detail.issue_date,
    due_date: detail.due_date,
    payment_terms: detail.payment_terms,
    status: detail.status,
    created_at: detail.created_at,
  };
}

function buildDetailFromPayload(
  id: number,
  body: PurchaseOrderCreatePayload,
  existing?: PurchaseOrderDetail,
): PurchaseOrderDetail {
  const ts = nowIso();
  const composite_items = normalizeCompositeItems(body.composite_items ?? []);
  const total = computeTotal(composite_items, body.total);
  const vendor = resolveVendorRef(body.vendor);
  const project =
    body.project != null && body.project > 0
      ? { id: body.project, name: existing?.project_name ?? `Project #${body.project}` }
      : null;

  return {
    id,
    purchase_order_number: existing?.purchase_order_number ?? formatPoNumber(id),
    vendor,
    contact:
      body.contact != null && body.contact > 0
        ? { id: body.contact, name: existing?.contact && typeof existing.contact === "object" ? existing.contact.name : `Contact #${body.contact}` }
        : null,
    project,
    project_name:
      project && typeof project === "object" && project.name
        ? project.name
        : existing?.project_name ?? null,
    bill_to: body.bill_to ?? existing?.bill_to ?? null,
    ship_to: body.ship_to ?? existing?.ship_to ?? null,
    issue_date: existing?.issue_date ?? todayDateOnly(),
    due_date: body.due_date ?? existing?.due_date ?? null,
    payment_terms: paymentTermsLabel(body.payment_terms) || existing?.payment_terms || "Net 30 Days",
    composite_items,
    total,
    sub_total: String(total.toFixed(2)),
    total_balance: String(total.toFixed(2)),
    adjustment_amount: "0.00",
    vendor_notes: body.vendor_notes ?? existing?.vendor_notes ?? null,
    internal_notes: body.internal_notes ?? existing?.internal_notes ?? null,
    status: existing?.status ?? "draft",
    created_at: existing?.created_at ?? ts,
    modified_at: ts,
    created_by: existing?.created_by ?? MOCK_USER,
    modified_by: MOCK_USER,
  };
}

export function seedPurchaseOrdersMockIfEmpty() {
  if (isPurchaseOrderMockSeeded()) return;
  const ts = nowIso();
  const vendor = resolveVendorRef(1);

  const row: PurchaseOrderDetail = {
    id: 1,
    purchase_order_number: "PO-2024-001",
    vendor,
    contact: { id: 1, name: "BuildPro Construction LLC" },
    project: { id: 11, name: "Deharadun Project initiative -D2" },
    project_name: "Deharadun Project initiative -D2",
    bill_to: {
      address_line_1: "Acme Corporation",
      address_line_2: "Business Park Phase 2",
      city: "Gurgaon",
      state: "Haryana",
      country: "India",
      pincode: "122001",
    },
    ship_to: {
      address_line_1: "Acme Warehouse",
      address_line_2: "Industrial Area",
      city: "Noida",
      state: "Uttar Pradesh",
      country: "India",
      pincode: "201301",
    },
    issue_date: "2026-06-02",
    due_date: "2026-07-02",
    payment_terms: "Net 30 Days",
    composite_items: [
      {
        group: { id: 7, name: "Electrical Work" },
        item: { id: 19, name: "Copper Wiring", selling_price: 345 },
        quantity: 23,
        line_total: 7935,
      },
      {
        group: { id: 7, name: "Electrical Work" },
        item: { id: 20, name: "Switch Board", selling_price: 120 },
        quantity: 10,
        line_total: 1200,
      },
      {
        group: null,
        item: { id: 45, name: "Transport Charges", selling_price: 500 },
        quantity: 5,
        line_total: 2500,
      },
    ],
    total: 11635,
    sub_total: "11635.00",
    total_balance: "11635.00",
    adjustment_amount: "0.00",
    vendor_notes:
      "Payment is due within 30 days of purchase order date. Late payments may incur additional charges.",
    internal_notes: "Add internal notes for office use only.",
    status: "draft",
    created_at: ts,
    modified_at: null,
    created_by: MOCK_USER,
    modified_by: null,
  };

  upsertPurchaseOrderMockEntity(row);
  markPurchaseOrderMockSeeded();
}

export type PurchaseOrderListFilters = {
  search?: string;
  status?: string;
  vendor?: number;
  issue_date?: string;
  due_date?: string;
};

export function fetchPurchaseOrdersPageMock(
  page = 1,
  pageSize = 20,
  filters?: PurchaseOrderListFilters,
): { items: PurchaseOrderListItem[]; pagination: PurchaseOrderPagination } {
  seedPurchaseOrdersMockIfEmpty();
  let items = listPurchaseOrderMockEntities().map(toListItem);

  const q = filters?.search?.trim().toLowerCase();
  if (q) {
    items = items.filter((row) => {
      const vendorName =
        row.vendor && typeof row.vendor === "object" ? row.vendor.name ?? "" : "";
      const hay = [row.purchase_order_number, vendorName, row.project_name, row.status]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  if (filters?.status?.trim()) {
    const status = filters.status.trim().toLowerCase();
    items = items.filter((row) => row.status.toLowerCase() === status);
  }

  if (typeof filters?.vendor === "number" && filters.vendor > 0) {
    items = items.filter((row) => {
      const id = typeof row.vendor === "number" ? row.vendor : row.vendor?.id;
      return id === filters.vendor;
    });
  }

  if (filters?.issue_date?.trim()) {
    items = items.filter((row) => row.issue_date === filters.issue_date?.trim());
  }

  if (filters?.due_date?.trim()) {
    items = items.filter((row) => row.due_date === filters.due_date?.trim());
  }

  const { slice, pagination } = paginate(items, page, pageSize);
  return { items: slice, pagination };
}

export function fetchPurchaseOrderMock(id: number): PurchaseOrderDetail | null {
  seedPurchaseOrdersMockIfEmpty();
  return getPurchaseOrderMockEntity(id);
}

export function createPurchaseOrderMock(body: PurchaseOrderCreatePayload): PurchaseOrderDetail {
  seedPurchaseOrdersMockIfEmpty();
  if (!body.vendor || body.vendor <= 0) {
    throw new Error("Vendor is required");
  }
  const id = allocatePurchaseOrderMockId();
  const row = buildDetailFromPayload(id, body);
  upsertPurchaseOrderMockEntity(row);
  return row;
}

export function updatePurchaseOrderMock(
  id: number,
  body: PurchaseOrderUpdatePayload,
): PurchaseOrderDetail | null {
  seedPurchaseOrdersMockIfEmpty();
  const existing = getPurchaseOrderMockEntity(id);
  if (!existing) return null;

  const merged: PurchaseOrderCreatePayload = {
    vendor: body.vendor ?? (typeof existing.vendor === "number" ? existing.vendor : existing.vendor?.id ?? 0),
    contact:
      body.contact ??
      (existing.contact && typeof existing.contact === "object" ? existing.contact.id : undefined),
    project:
      body.project ??
      (existing.project && typeof existing.project === "object" ? existing.project.id : undefined),
    due_date: body.due_date ?? existing.due_date ?? undefined,
    payment_terms: body.payment_terms ?? existing.payment_terms ?? undefined,
    total: body.total ?? coerceNumber(existing.total),
    bill_to: body.bill_to ?? existing.bill_to ?? undefined,
    ship_to: body.ship_to ?? existing.ship_to ?? undefined,
    vendor_notes: body.vendor_notes ?? existing.vendor_notes ?? undefined,
    internal_notes: body.internal_notes ?? existing.internal_notes ?? undefined,
    composite_items:
      body.composite_items ??
      (existing.composite_items ?? []).map((row) => {
        const itemId =
          typeof row.id === "number"
            ? row.id
            : typeof row.item === "object"
              ? row.item?.id
              : typeof row.item === "number"
                ? row.item
                : 0;
        const amount =
          row.amount ??
          (typeof row.line_total === "number"
            ? row.line_total
            : Number.parseFloat(String(row.line_total ?? "0")));
        return {
          id: itemId ?? 0,
          name: row.name ?? (typeof row.item === "object" ? row.item?.name ?? undefined : undefined),
          group:
            row.group && typeof row.group === "object"
              ? row.group
              : typeof row.group === "number"
                ? { id: row.group, name: "" }
                : null,
          quantity: row.quantity,
          amount: Number.isFinite(amount) ? amount : 0,
        };
      }),
  };

  const row = buildDetailFromPayload(id, merged, existing);
  upsertPurchaseOrderMockEntity(row);
  return row;
}

export function deletePurchaseOrderMock(id: number): boolean {
  seedPurchaseOrdersMockIfEmpty();
  return deletePurchaseOrderMockEntity(id);
}
