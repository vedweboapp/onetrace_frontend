import type { QuotationCreatePayload, QuotationDetail } from "@/features/quotations/types/quotation.types";
import type { QuotationFormValues } from "@/features/quotations/schemas/quotation-form-schema";
import { QUOTE_CATEGORY, type QuoteCategoryApi } from "@/features/quotations/constants/quotation-category";
import {
  getQuotationAdditionalContactIds,
  getQuotationContactId,
  getQuotationCustomerId,
  getQuotationLevelIds,
  getQuotationOptionalUserId,
  getQuotationProjectId,
  getQuotationSiteIds,
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

function parseAdditionalContactIds(rows: QuotationFormValues["additional_customer_contacts"] | undefined): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const row of rows ?? []) {
    const id = parseOptionalId(row.contact);
    if (id != null && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Ensures manual create/update payloads always send `additional_customer_contact` as id list. */
export function quotationAdditionalContactIdsForApi(
  rows: QuotationFormValues["additional_customer_contacts"] | undefined,
): number[] {
  return parseAdditionalContactIds(rows);
}

export function mapQuotationFormToPayload(
  values: QuotationFormValues,
  options?: { quote_category?: QuoteCategoryApi },
): QuotationCreatePayload {
  const due = values.due_date.trim();
  const orderNum = values.order_number.trim();
  const desc = values.description.trim();
  const sites = (values.sites ?? [])
    .map((raw) => Number.parseInt(raw, 10))
    .filter((id) => Number.isFinite(id) && id > 0);
  const projectId = parseOptionalId(values.project);
  const quote_category =
    options?.quote_category ?? (projectId != null ? QUOTE_CATEGORY.project : QUOTE_CATEGORY.service);

  return {
    customer: Number.parseInt(values.customer, 10),
    sites,
    quote_name: capitalizeFirstLetter(values.quote_name.trim()),
    primary_customer_contact: parseOptionalId(values.primary_customer_contact),
    additional_customer_contact: quotationAdditionalContactIdsForApi(values.additional_customer_contacts),
    tags: Array.isArray(values.tag_ids) && values.tag_ids.length > 0 ? values.tag_ids : parseTags(values.tags_raw),
    order_number: orderNum || null,
    due_date: due || null,
    salesperson: parseOptionalId(values.salesperson),
    project_manager: parseOptionalId(values.project_manager),
    technicians: values.technician_ids,
    description: desc || null,
    project: quote_category === QUOTE_CATEGORY.service ? null : projectId,
    quote_category,
    levels: values.select_all_levels ? [] : values.level_ids,
    select_all_levels: values.select_all_levels,
  };
}

export function emptyQuotationFormDefaults(): QuotationFormValues {
  return {
    quote_name: "",
    customer: "",
    sites: [],
    project: "",
    primary_customer_contact: "",
    additional_customer_contacts: [],
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
    sites: getQuotationSiteIds(detail).map(String),
    project: asIdString(getQuotationProjectId(detail.project)),
    primary_customer_contact: asIdString(getQuotationContactId(detail.primary_customer_contact)),
    additional_customer_contacts: getQuotationAdditionalContactIds(detail.additional_customer_contact).map((id) => ({
      contact: String(id),
    })),
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
