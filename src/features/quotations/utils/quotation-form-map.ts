import type { QuotationCreatePayload } from "@/features/quotations/types/quotation.types";
import type { QuotationFormValues } from "@/features/quotations/schemas/quotation-form-schema";

function parseOptionalId(raw: string): number | null {
  const s = raw.trim();
  if (!s || !/^\d+$/.test(s)) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseTags(raw: string): number[] {
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  const out: number[] = [];
  const seen = new Set<number>();
  for (const p of parts) {
    if (!/^\d+$/.test(p)) continue;
    const n = Number.parseInt(p, 10);
    if (!Number.isFinite(n) || n <= 0 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export function mapQuotationFormToPayload(values: QuotationFormValues): QuotationCreatePayload {
  const due = values.due_date.trim();
  const orderNum = values.order_number.trim();
  const desc = values.description.trim();

  return {
    customer: Number.parseInt(values.customer, 10),
    site: Number.parseInt(values.site, 10),
    quote_name: values.quote_name.trim(),
    primary_customer_contact: parseOptionalId(values.primary_customer_contact),
    additional_customer_contact: parseOptionalId(values.additional_customer_contact),
    site_contact: parseOptionalId(values.site_contact),
    tags: parseTags(values.tags_raw),
    order_number: orderNum || null,
    due_date: due || null,
    salesperson: parseOptionalId(values.salesperson),
    project_manager: parseOptionalId(values.project_manager),
    technicians: values.technician_ids,
    description: desc || null,
    project: Number.parseInt(values.project, 10),
    levels: values.select_all_levels ? [] : values.level_ids,
    select_all_levels: values.select_all_levels,
  };
}

export function emptyQuotationFormDefaults(): QuotationFormValues {
  return {
    quote_name: "",
    customer: "",
    site: "",
    project: "",
    primary_customer_contact: "",
    additional_customer_contact: "",
    site_contact: "",
    tags_raw: "",
    order_number: "",
    due_date: "",
    salesperson: "",
    project_manager: "",
    technician_ids: [],
    description: "",
    select_all_levels: false,
    level_ids: [],
  };
}
