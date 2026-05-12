import type { QuotationCreatePayload, QuotationDetail } from "@/features/quotations/types/quotation.types";
import type { QuotationFormValues } from "@/features/quotations/schemas/quotation-form-schema";
import {
  getQuotationContactId,
  getQuotationCustomerId,
  getQuotationLevelIds,
  getQuotationOptionalUserId,
  getQuotationSiteId,
  getQuotationTagIds,
  getQuotationTechnicianIds,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import { formatApiDateForHtmlDateInput } from "@/shared/utils/api-date-parse.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";

export function parseOptionalId(raw: string): number | null {
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
    quote_name: capitalizeFirstLetter(values.quote_name.trim()),
    primary_customer_contact: parseOptionalId(values.primary_customer_contact),
    additional_customer_contact: parseOptionalId(values.additional_customer_contact),
    tags: Array.isArray(values.tag_ids) && values.tag_ids.length > 0 ? values.tag_ids : parseTags(values.tags_raw),
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
    tag_ids: [],
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

function asIdString(value: number | string | null | undefined): string {
  if (typeof value === "number" && value > 0) return String(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return value.trim();
  return "";
}

export function mapQuotationDetailToFormDefaults(detail: QuotationDetail): QuotationFormValues {
  const tagIds = getQuotationTagIds(detail.tags);
  return {
    quote_name: detail.quote_name ?? "",
    customer: asIdString(getQuotationCustomerId(detail.customer)),
    site: asIdString(getQuotationSiteId(detail.site)),
    project: asIdString(typeof detail.project === "object" && detail.project ? detail.project.id : detail.project),
    primary_customer_contact: asIdString(getQuotationContactId(detail.primary_customer_contact)),
    additional_customer_contact: asIdString(getQuotationContactId(detail.additional_customer_contact)),
    site_contact: asIdString(
      typeof detail.site_snapshot?.site_contact === "number"
        ? detail.site_snapshot.site_contact
        : getQuotationContactId(detail.site_contact),
    ),
    tags_raw: tagIds.join(", "),
    tag_ids: tagIds,
    order_number: detail.order_number ?? "",
    due_date: formatApiDateForHtmlDateInput(detail.due_date),
    salesperson: asIdString(getQuotationOptionalUserId(detail.salesperson)),
    project_manager: asIdString(getQuotationOptionalUserId(detail.project_manager)),
    technician_ids: getQuotationTechnicianIds(detail),
    description: detail.description ?? "",
    select_all_levels: !!detail.select_all_levels,
    level_ids: getQuotationLevelIds(detail.levels),
  };
}
