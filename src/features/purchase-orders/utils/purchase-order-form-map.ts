import { parseFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import type {
  PurchaseOrderCompositeItem,
  PurchaseOrderContactRef,
  PurchaseOrderCreatePayload,
  PurchaseOrderDetail,
  PurchaseOrderEntityAddress,
} from "@/features/purchase-orders/types/purchase-order.types";
import type { PurchaseOrderFormValues } from "@/features/purchase-orders/schemas/purchase-order-form-schema";
import { buildJobMetaPayload, type JobMetaFormRow } from "@/features/jobs/utils/job-meta-payload.util";
import { computeLineAmount, parseMoneyValue } from "@/features/invoices/utils/invoice-money.util";
import { nestedId } from "@/features/purchase-orders/utils/purchase-order-nested-fields.util";
import {
  emptyEntityAddressFormRow,
  mapEntityAddressApiToFormRow,
  mapEntityAddressFormRowToPayload,
  normalizePrimaryEntityAddresses,
} from "@/shared/form/entity-address-form.util";
import { normalizeEntityAddressType } from "@/shared/types/entity-address.types";

export function formatApiDateForHtmlDateInput(raw: string | null | undefined): string {
  const d = parseFlexibleApiDate(raw);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function legacyAddressToEntity(
  addr: NonNullable<PurchaseOrderDetail["bill_to"]>,
  addressType: "billing" | "shipping",
  isPrimary: boolean,
): PurchaseOrderEntityAddress {
  return {
    address_type: addressType,
    address_line_1: addr.address_line_1?.trim() ?? "",
    address_line_2: addr.address_line_2?.trim() || null,
    city: addr.city?.trim() ?? "",
    state: addr.state?.trim() ?? "",
    country: addr.country?.trim() ?? "",
    pincode: (addr.pincode ?? addr.zip_code)?.trim() ?? "",
    is_primary: isPrimary,
  };
}

/** Prefer API `addresses[]`; fall back to legacy bill_to / ship_to. */
export function resolvePurchaseOrderAddresses(order: PurchaseOrderDetail): PurchaseOrderEntityAddress[] {
  if (Array.isArray(order.addresses) && order.addresses.length > 0) {
    return order.addresses.map((addr) => ({
      ...addr,
      address_type: normalizeEntityAddressType(addr.address_type),
      pincode: addr.pincode ?? "",
    }));
  }

  const rows: PurchaseOrderEntityAddress[] = [];
  if (order.bill_to) {
    rows.push(legacyAddressToEntity(order.bill_to, "billing", true));
  }
  if (order.ship_to) {
    rows.push(legacyAddressToEntity(order.ship_to, "shipping", rows.length === 0));
  }
  return rows;
}

function newLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyPurchaseOrderLineItem(): PurchaseOrderFormValues["line_items"][number] {
  return {
    id: newLineId(),
    group: "",
    group_name: "",
    item: "",
    item_name: "",
    quantity: "1",
    rate: "",
  };
}

function compositeItemFromApi(row: PurchaseOrderCompositeItem): PurchaseOrderFormValues["line_items"][number] {
  const itemId =
    typeof row.id === "number"
      ? row.id
      : typeof row.item === "number"
        ? row.item
        : row.item && typeof row.item === "object"
          ? row.item.id
          : undefined;
  const groupId =
    typeof row.group === "number"
      ? row.group
      : row.group && typeof row.group === "object"
        ? row.group.id
        : undefined;
  const groupName =
    row.group && typeof row.group === "object" ? (row.group.name?.trim() ?? "") : "";
  const itemName =
    row.name?.trim() ||
    (row.item && typeof row.item === "object" ? (row.item.name?.trim() ?? "") : "");
  const qty = row.quantity != null && row.quantity > 0 ? row.quantity : 1;
  let rate = "";
  if (row.amount != null && Number.isFinite(row.amount) && qty > 0) {
    rate = String(Number((row.amount / qty).toFixed(4)));
  } else if (row.line_total != null) {
    const lineTotal = parseMoneyValue(row.line_total);
    if (lineTotal > 0 && qty > 0) rate = String(Number((lineTotal / qty).toFixed(4)));
  } else if (row.item && typeof row.item === "object") {
    const sp = parseMoneyValue(row.item.selling_price);
    if (sp > 0) rate = String(sp);
  }
  return {
    id: newLineId(),
    group: groupId != null ? String(groupId) : "",
    group_name: groupName,
    item: itemId != null ? String(itemId) : "",
    item_name: itemName,
    quantity: row.quantity != null ? String(row.quantity) : "1",
    rate,
  };
}

function lineItemToMetaRow(row: PurchaseOrderFormValues["line_items"][number]): JobMetaFormRow {
  return {
    group: row.group,
    group_name: row.group_name,
    item: row.item,
    item_name: row.item_name,
    quantity: row.quantity,
    rate: row.rate,
  };
}

export function computeFormSubtotal(lines: PurchaseOrderFormValues["line_items"]): number {
  return lines.reduce((sum, row) => {
    const qty = parseMoneyValue(row.quantity);
    const rate = parseMoneyValue(row.rate);
    return sum + computeLineAmount(qty, rate);
  }, 0);
}

export function mapPurchaseOrderFormToPayload(values: PurchaseOrderFormValues): PurchaseOrderCreatePayload {
  const meta = buildJobMetaPayload(values.line_items.map(lineItemToMetaRow));

  const contactRaw = values.contact.trim();
  const contact =
    contactRaw && /^\d+$/.test(contactRaw) ? Number.parseInt(contactRaw, 10) : undefined;

  const addresses = normalizePrimaryEntityAddresses(values.addresses).map((row) => {
    const { latitude: _lat, longitude: _lon, ...rest } = mapEntityAddressFormRowToPayload(row);
    return rest;
  });

  const payload: PurchaseOrderCreatePayload = {
    vendor: Number.parseInt(values.vendor, 10),
    total: meta?.total ?? computeFormSubtotal(values.line_items),
    addresses,
    composite_items: (meta?.composite_items ?? [])
      .filter((row): row is typeof row & { id: number } => typeof row.id === "number")
      .map(({ id, name, group, quantity, amount }) => ({ id, name, group, quantity, amount })),
  };

  if (contact != null) payload.contact = contact;
  const projectValue = values.project.trim();
  if (/^\d+$/.test(projectValue)) payload.project = Number.parseInt(projectValue, 10);
  const dueRaw = values.due_date.trim();
  if (dueRaw) payload.due_date = dueRaw;
  const paymentTerms = values.payment_terms.trim();
  if (paymentTerms) payload.payment_terms = paymentTerms;
  const vendorNotes = values.vendor_notes.trim();
  if (vendorNotes) payload.vendor_notes = vendorNotes;
  const internalNotes = values.internal_notes.trim();
  if (internalNotes) payload.internal_notes = internalNotes;

  return payload;
}

export function emptyPurchaseOrderFormDefaults(): PurchaseOrderFormValues {
  return {
    vendor: "",
    contact: "",
    project: "",
    due_date: "",
    payment_terms: "net_30",
    addresses: [emptyEntityAddressFormRow({ address_type: "billing", is_primary: true })],
    vendor_notes: "",
    internal_notes: "",
    line_items: [emptyPurchaseOrderLineItem()],
  };
}

export function purchaseOrderToFormDefaults(order: PurchaseOrderDetail): PurchaseOrderFormValues {
  const lines =
    order.composite_items && order.composite_items.length > 0
      ? order.composite_items.map(compositeItemFromApi)
      : [emptyPurchaseOrderLineItem()];

  const addresses = resolvePurchaseOrderAddresses(order);

  return {
    vendor: String(nestedId(order.vendor) ?? ""),
    contact: String(nestedId(order.contact as number | PurchaseOrderContactRef | null | undefined) ?? ""),
    project: String(nestedId(order.project) ?? ""),
    due_date: formatApiDateForHtmlDateInput(order.due_date),
    payment_terms: order.payment_terms ?? "",
    addresses:
      addresses.length > 0
        ? addresses.map((addr) => mapEntityAddressApiToFormRow(addr))
        : [emptyEntityAddressFormRow({ address_type: "billing", is_primary: true })],
    vendor_notes: order.vendor_notes ?? "",
    internal_notes: order.internal_notes ?? "",
    line_items: lines,
  };
}
