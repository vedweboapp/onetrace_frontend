import { parseFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { Country, State } from "country-state-city";
import type {
  InvoiceAddress,
  InvoiceCompositeItem,
  InvoiceContactRef,
  InvoiceCreatePayload,
  InvoiceDetail,
  InvoiceLineItem,
} from "@/features/invoices/types/invoice.types";
import type { InvoiceFormValues } from "@/features/invoices/schemas/invoice-form-schema";
import { buildJobMetaPayload, type JobMetaFormRow } from "@/features/jobs/utils/job-meta-payload.util";
import { computeLineAmount, parseMoneyValue } from "@/features/invoices/utils/invoice-money.util";
import { nestedId } from "@/features/invoices/utils/invoice-nested-fields.util";

export function formatApiDateForHtmlDateInput(raw: string | null | undefined): string {
  const d = parseFlexibleApiDate(raw);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function htmlDateInputToIso(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const d = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toISOString();
}

function emptyAddress(): InvoiceFormValues["bill_to"] {
  return {
    address_line_1: "",
    address_line_2: "",
    country_iso: "",
    state_iso: "",
    city: "",
    pincode: "",
  };
}

function addressFromApi(addr: InvoiceAddress | null | undefined): InvoiceFormValues["bill_to"] {
  if (!addr) return emptyAddress();
  return {
    address_line_1: addr.address_line_1 ?? "",
    address_line_2: addr.address_line_2 ?? "",
    country_iso: "",
    state_iso: "",
    city: addr.city ?? "",
    pincode: addr.zip_code ?? addr.pincode ?? "",
  };
}

function addressToPayload(addr: InvoiceFormValues["bill_to"]): InvoiceAddress | undefined {
  const hasAny = Object.values(addr).some((v) => v.trim().length > 0);
  if (!hasAny) return undefined;
  const countryName = Country.getCountryByCode(addr.country_iso)?.name ?? "";
  const stateName = State.getStateByCodeAndCountry(addr.state_iso, addr.country_iso)?.name ?? "";
  return {
    address_line_1: addr.address_line_1.trim() || null,
    address_line_2: addr.address_line_2.trim() || null,
    city: addr.city.trim() || null,
    state: stateName || null,
    pincode: addr.pincode.trim() || null,
    country: countryName || null,
  };
}

function newLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyInvoiceLineItem(): InvoiceFormValues["line_items"][number] {
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

export function lineItemFromApi(row: InvoiceLineItem): InvoiceFormValues["line_items"][number] {
  const rate = parseMoneyValue(row.rate ?? row.list_price);
  return {
    id: row.id != null ? String(row.id) : newLineId(),
    group: "",
    group_name: "",
    item: row.product != null ? String(row.product) : "",
    item_name: row.product_name?.trim() ?? "",
    quantity: row.quantity != null ? String(row.quantity) : "1",
    rate: rate > 0 ? String(rate) : "",
  };
}

function compositeItemFromApi(row: InvoiceCompositeItem): InvoiceFormValues["line_items"][number] {
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

function lineItemToMetaRow(row: InvoiceFormValues["line_items"][number]): JobMetaFormRow {
  return {
    group: row.group,
    group_name: row.group_name,
    item: row.item,
    item_name: row.item_name,
    quantity: row.quantity,
    rate: row.rate,
  };
}

export function computeFormSubtotal(lines: InvoiceFormValues["line_items"]): number {
  return lines.reduce((sum, row) => {
    const qty = parseMoneyValue(row.quantity);
    const rate = parseMoneyValue(row.rate);
    return sum + computeLineAmount(qty, rate);
  }, 0);
}

export function mapInvoiceFormToPayload(values: InvoiceFormValues): InvoiceCreatePayload {
  const meta = buildJobMetaPayload(values.line_items.map(lineItemToMetaRow));

  const contactRaw = values.contact.trim();
  
  const contact =
    contactRaw && /^\d+$/.test(contactRaw) ? Number.parseInt(contactRaw, 10) : undefined;

  const payload: InvoiceCreatePayload = {
    client: Number.parseInt(values.client, 10),
    total: meta?.total ?? computeFormSubtotal(values.line_items),
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
  const billTo = addressToPayload(values.bill_to);
  if (billTo) payload.bill_to = billTo;
  const shipTo = addressToPayload(values.ship_to);
  if (shipTo) payload.ship_to = shipTo;
  const clientNotes = values.client_notes.trim();
  if (clientNotes) payload.client_notes = clientNotes;
  const internalNotes = values.internal_notes.trim();
  if (internalNotes) payload.internal_notes = internalNotes;

  return payload;
}

export function emptyInvoiceFormDefaults(): InvoiceFormValues {
  return {
    client: "",
    contact: "",
    project: "",
    due_date: "",
    payment_terms: "net_30",
    bill_to: emptyAddress(),
    ship_to: emptyAddress(),
    client_notes: "",
    internal_notes: "",
    line_items: [emptyInvoiceLineItem()],
  };
}

export function invoiceToFormDefaults(invoice: InvoiceDetail): InvoiceFormValues {
  const billTo = invoice.bill_to ?? invoice.billing_address;
  const shipTo = invoice.ship_to ?? invoice.shipping_address;
  const lines =
    invoice.composite_items && invoice.composite_items.length > 0
      ? invoice.composite_items.map(compositeItemFromApi)
      : invoice.line_items && invoice.line_items.length > 0
      ? invoice.line_items.map(lineItemFromApi)
      : [emptyInvoiceLineItem()];

  return {
    client: String(nestedId(invoice.client) ?? ""),
    contact: String(
      nestedId(
        (invoice.contact ?? invoice.contact_person) as number | InvoiceContactRef | null | undefined,
      ) ?? "",
    ),
    project: String(nestedId(invoice.project) ?? ""),
    due_date: formatApiDateForHtmlDateInput(invoice.due_date),
    payment_terms: invoice.payment_terms ?? "",
    bill_to: addressFromApi(billTo),
    ship_to: addressFromApi(shipTo),
    client_notes: invoice.client_notes ?? "",
    internal_notes: invoice.internal_notes ?? "",
    line_items: lines,
  };
}
