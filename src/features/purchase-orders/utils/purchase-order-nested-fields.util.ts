import type {
  PurchaseOrderContactRef,
  PurchaseOrderDetail,
  PurchaseOrderListItem,
  PurchaseOrderVendorRef,
} from "@/features/purchase-orders/types/purchase-order.types";
import { parseMoneyValue } from "@/features/invoices/utils/invoice-money.util";

export function nestedId(value: number | { id: number } | null | undefined): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "object" && typeof value.id === "number" && value.id > 0) return value.id;
  return undefined;
}

export function purchaseOrderVendorLabel(
  vendor: PurchaseOrderListItem["vendor"],
  fallbackName?: string,
): string {
  if (vendor && typeof vendor === "object" && vendor.name?.trim()) return vendor.name.trim();
  if (fallbackName?.trim()) return fallbackName.trim();
  const id = nestedId(vendor);
  return id != null ? `#${id}` : "—";
}

export function purchaseOrderProjectLabel(row: PurchaseOrderListItem | PurchaseOrderDetail): string {
  if (row.project && typeof row.project === "object" && row.project.name?.trim()) return row.project.name.trim();
  const project = row.project_name?.trim();
  if (project) return project;
  return "—";
}

export function purchaseOrderContactLabel(
  contact: PurchaseOrderDetail["contact"],
  fallbackName?: string,
): string {
  if (contact && typeof contact === "object") {
    const person = contact.contact_person?.trim();
    if (person) return person;
    const name = contact.name?.trim();
    if (name) return name;
  }
  if (fallbackName?.trim()) return fallbackName.trim();
  const id = nestedId(contact as number | PurchaseOrderContactRef | null | undefined);
  return id != null ? `#${id}` : "—";
}

export function purchaseOrderTotalAmount(row: {
  total?: number | string | null;
  total_balance?: number | string | null;
  sub_total?: number | string | null;
}): number {
  const raw = row.total ?? row.total_balance ?? row.sub_total;
  return parseMoneyValue(raw);
}

export function purchaseOrderListAmount(row: PurchaseOrderListItem): number {
  return purchaseOrderTotalAmount(row);
}

export function normalizePurchaseOrderStatus(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

const PAYMENT_TERM_LABELS: Record<string, string> = {
  net_7: "Net 7 Days",
  net_15: "Net 15 Days",
  net_30: "Net 30 Days",
  net_45: "Net 45 Days",
  due_on_receipt: "Due on Receipt",
};

export function purchaseOrderPaymentTermsLabel(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "—";
  const key = trimmed.toLowerCase();
  return PAYMENT_TERM_LABELS[key] ?? trimmed;
}
