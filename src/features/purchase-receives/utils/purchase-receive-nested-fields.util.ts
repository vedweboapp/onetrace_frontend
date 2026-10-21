import type {
  PurchaseReceiveListItem,
  PurchaseReceiveVendorRef,
} from "@/features/purchase-receives/types/purchase-receive.types";

export function nestedId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const n = Number.parseInt(value.trim(), 10);
    return n > 0 ? n : null;
  }
  if (value && typeof value === "object" && "id" in value) {
    return nestedId((value as { id: unknown }).id);
  }
  return null;
}

export function normalizePurchaseReceiveStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function purchaseReceiveVendorLabel(
  vendor: number | PurchaseReceiveVendorRef | null | undefined,
  fallbackName?: string,
): string {
  if (vendor && typeof vendor === "object") {
    const name = vendor.name?.trim();
    if (name) return name;
  }
  if (fallbackName?.trim()) return fallbackName.trim();
  const id = nestedId(vendor);
  return id != null ? `#${id}` : "—";
}

export function purchaseReceivePoLabel(row: PurchaseReceiveListItem): string {
  const po = row.purchase_order;
  if (po && typeof po === "object") {
    const num = po.purchase_order_number?.trim();
    if (num) return num;
    if (po.id > 0) return `PO #${po.id}`;
  }
  const id = nestedId(po);
  return id != null ? `PO #${id}` : "—";
}
