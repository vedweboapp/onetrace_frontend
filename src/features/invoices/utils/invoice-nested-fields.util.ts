import type { InvoiceClientRef, InvoiceContactRef, InvoiceDetail, InvoiceListItem } from "@/features/invoices/types/invoice.types";
import { formatContactName } from "@/features/contacts/utils/contact-name.util";

export function nestedId(value: number | { id: number } | null | undefined): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "object" && typeof value.id === "number" && value.id > 0) return value.id;
  return undefined;
}

export function invoiceClientLabel(
  client: InvoiceListItem["client"],
  fallbackName?: string,
): string {
  if (client && typeof client === "object" && client.name?.trim()) return client.name.trim();
  if (fallbackName?.trim()) return fallbackName.trim();
  const id = nestedId(client);
  return id != null ? `#${id}` : "—";
}

export function invoiceJobOrProjectLabel(row: InvoiceListItem | InvoiceDetail): string {
  const job = row.job_name?.trim();
  if (job) return job;
  if (row.project && typeof row.project === "object" && row.project.name?.trim()) return row.project.name.trim();
  const project = row.project_name?.trim();
  if (project) return project;
  return "—";
}

export function invoiceContactLabel(
  contact: InvoiceDetail["contact"] | InvoiceDetail["contact_person"],
  fallbackName?: string,
): string {
  if (contact && typeof contact === "object") {
    const person = contact.contact_person?.trim();
    if (person) return person;
    const name = formatContactName(contact);
    if (name) return name;
  }
  if (fallbackName?.trim()) return fallbackName.trim();
  const id = nestedId(contact as number | InvoiceContactRef | null | undefined);
  return id != null ? `#${id}` : "—";
}

export function invoiceContactPersonLabel(
  detail: Pick<InvoiceDetail, "client" | "contact" | "contact_person">,
  fallbackName?: string,
): string {
  const client = detail.client;
  if (client && typeof client === "object" && client.contact_person?.trim()) {
    return client.contact_person.trim();
  }
  return invoiceContactLabel(detail.contact ?? detail.contact_person, fallbackName);
}

export function parseInvoiceAmount(raw: number | string | null | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function invoiceTotalAmount(row: {
  total?: number | string | null;
  total_balance?: number | string | null;
  subtotal?: number | string | null;
  sub_total?: number | string | null;
  amount?: number | string | null;
}): number {
  return parseInvoiceAmount(row.total ?? row.total_balance ?? row.subtotal ?? row.sub_total ?? row.amount);
}

export function invoiceListAmount(row: InvoiceListItem): number {
  return invoiceTotalAmount(row);
}

export function normalizeInvoiceStatus(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

const PAYMENT_TERM_LABELS: Record<string, string> = {
  net_7: "Net 7 days",
  net_30: "Net 30 days",
  net_45: "Net 45 days",
  net_15: "Net 15 days",
  due_on_receipt: "Due on receipt",
};

export function invoicePaymentTermsLabel(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "—";
  const key = trimmed.toLowerCase();
  return PAYMENT_TERM_LABELS[key] ?? trimmed;
}
