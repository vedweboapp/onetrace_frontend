import { parseFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import type { PurchaseOrderDetail } from "@/features/purchase-orders/types/purchase-order.types";
import type {
  PurchaseReceiveCreatePayload,
  PurchaseReceiveDetail,
  PurchaseReceiveLineItem,
} from "@/features/purchase-receives/types/purchase-receive.types";
import type { PurchaseReceiveFormValues } from "@/features/purchase-receives/schemas/purchase-receive-form-schema";
import { nestedId } from "@/features/purchase-receives/utils/purchase-receive-nested-fields.util";
import { parseMoneyValue } from "@/features/invoices/utils/invoice-money.util";

function newLineId(): string {
  return `pr-line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function qtyString(value: string | number | null | undefined, fallback = "0.00"): string {
  if (value == null || value === "") return fallback;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return fallback;
  return n.toFixed(2);
}

export function formatApiDateForHtmlDateInput(raw: string | null | undefined): string {
  const d = parseFlexibleApiDate(raw);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function emptyPurchaseReceiveLineItem(): PurchaseReceiveFormValues["line_items"][number] {
  return {
    id: newLineId(),
    item: "",
    item_name: "",
    group: "",
    ordered_quantity: "0.00",
    received_quantity: "0.00",
    billed_quantity: "0.00",
    unit_price: "",
  };
}

export function emptyPurchaseReceiveFormDefaults(): PurchaseReceiveFormValues {
  const today = formatApiDateForHtmlDateInput(new Date().toISOString());
  return {
    purchase_receive_number: "",
    receive_date: today,
    tracking_number: "",
    tracking_link: "",
    notes: "",
    status: "received",
    vendor: "",
    purchase_order: "",
    line_items: [emptyPurchaseReceiveLineItem()],
  };
}

function lineFromApi(row: PurchaseReceiveLineItem): PurchaseReceiveFormValues["line_items"][number] {
  const itemId = nestedId(row.item);
  const groupId = nestedId(row.group);
  const snapshot = row.purchase_order_snapshot;
  return {
    id: newLineId(),
    item: itemId != null ? String(itemId) : "",
    item_name: snapshot?.item_name?.trim() || (itemId != null ? `#${itemId}` : ""),
    group: groupId != null ? String(groupId) : "",
    ordered_quantity: qtyString(row.ordered_quantity),
    received_quantity: qtyString(row.received_quantity),
    billed_quantity: qtyString(row.billed_quantity),
    unit_price:
      snapshot?.unit_price != null && String(snapshot.unit_price).trim() !== ""
        ? String(snapshot.unit_price)
        : "",
  };
}

export function purchaseReceiveToFormDefaults(detail: PurchaseReceiveDetail): PurchaseReceiveFormValues {
  const lines =
    detail.line_items && detail.line_items.length > 0
      ? detail.line_items.map(lineFromApi)
      : [emptyPurchaseReceiveLineItem()];

  return {
    purchase_receive_number: detail.purchase_receive_number ?? "",
    receive_date: formatApiDateForHtmlDateInput(detail.receive_date),
    tracking_number: detail.tracking_number ?? "",
    tracking_link: detail.tracking_link ?? "",
    notes: detail.notes ?? "",
    status: detail.status || "received",
    vendor: String(nestedId(detail.vendor) ?? ""),
    purchase_order: String(nestedId(detail.purchase_order) ?? ""),
    line_items: lines,
  };
}

/** Prefill receive lines from a purchase order's composite items. */
export function lineItemsFromPurchaseOrder(
  order: PurchaseOrderDetail,
): PurchaseReceiveFormValues["line_items"] {
  const rows = order.composite_items ?? [];
  if (rows.length === 0) return [emptyPurchaseReceiveLineItem()];

  return rows.map((row) => {
    const itemId =
      nestedId(row.item) ??
      (typeof row.id === "number" && row.id > 0 ? row.id : null);
    const groupId = nestedId(row.group);
    const name =
      row.name?.trim() ||
      (row.item && typeof row.item === "object" ? row.item.name?.trim() : "") ||
      (itemId != null ? `#${itemId}` : "");
    const qty = row.quantity > 0 ? row.quantity : 1;
    let unitPrice = "";
    if (row.amount != null && Number.isFinite(row.amount) && qty > 0) {
      unitPrice = (row.amount / qty).toFixed(2);
    } else if (row.item && typeof row.item === "object") {
      const sp = parseMoneyValue(row.item.selling_price);
      if (sp > 0) unitPrice = sp.toFixed(2);
    }
    return {
      id: newLineId(),
      item: itemId != null ? String(itemId) : "",
      item_name: name || "",
      group: groupId != null ? String(groupId) : "",
      ordered_quantity: qty.toFixed(2),
      received_quantity: qty.toFixed(2),
      billed_quantity: "0.00",
      unit_price: unitPrice,
    };
  });
}

export function mapPurchaseReceiveFormToPayload(
  values: PurchaseReceiveFormValues,
): PurchaseReceiveCreatePayload {
  const payload: PurchaseReceiveCreatePayload = {
    receive_date: values.receive_date.trim(),
    status: values.status.trim(),
    vendor: Number.parseInt(values.vendor, 10),
    line_items: values.line_items
      .filter((row) => /^\d+$/.test(row.item.trim()))
      .map((row) => {
        const groupRaw = row.group.trim();
        const group =
          groupRaw && /^\d+$/.test(groupRaw) ? Number.parseInt(groupRaw, 10) : null;
        const line: PurchaseReceiveCreatePayload["line_items"][number] = {
          item: Number.parseInt(row.item.trim(), 10),
          group,
          ordered_quantity: qtyString(row.ordered_quantity),
          received_quantity: qtyString(row.received_quantity),
          billed_quantity: qtyString(row.billed_quantity),
        };
        const itemName = row.item_name.trim();
        const unitPrice = row.unit_price.trim();
        if (itemName || unitPrice) {
          line.purchase_order_snapshot = {
            ...(itemName ? { item_name: itemName } : {}),
            ...(unitPrice ? { unit_price: unitPrice } : {}),
          };
        }
        return line;
      }),
  };

  const receiveNumber = values.purchase_receive_number.trim();
  if (receiveNumber) payload.purchase_receive_number = receiveNumber;
  const tracking = values.tracking_number.trim();
  if (tracking) payload.tracking_number = tracking;
  const link = values.tracking_link.trim();
  if (link) payload.tracking_link = link;
  const notes = values.notes.trim();
  if (notes) payload.notes = notes;
  const poRaw = values.purchase_order.trim();
  if (/^\d+$/.test(poRaw)) payload.purchase_order = Number.parseInt(poRaw, 10);

  return payload;
}
