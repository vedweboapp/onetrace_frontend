import { parseFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import type { Job, JobCreatePayload, JobFormRef } from "@/features/jobs/types/job.types";
import type { JobFormValues } from "@/features/jobs/schemas/job-form-schema";
import { getJobAssignedWorkerId } from "@/features/jobs/utils/job-nested-fields.util";
import { buildJobMetaPayload, normalizeJobMeta } from "@/features/jobs/utils/job-meta-payload.util";

export function formatApiDateTimeForHtmlDatetimeLocal(raw: string | null | undefined): string {
  const d = parseFlexibleApiDate(raw);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function htmlDatetimeLocalToIso(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toISOString();
}

function parseOptionalIdField(raw: string): number | undefined {
  const s = raw.trim();
  if (!s || !/^\d+$/.test(s)) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseFormIdList(ids: string[]): number[] | undefined {
  const parsed = ids
    .map((raw) => Number.parseInt(raw, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  const unique = [...new Set(parsed)];
  return unique.length > 0 ? unique : undefined;
}

function nestedId(value: number | { id: number } | null | undefined): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "object" && typeof value.id === "number" && value.id > 0) return value.id;
  return undefined;
}

export function jobFormsToFormIds(forms: Job["forms"]): string[] {
  if (forms == null) return [];
  if (typeof forms === "number" && forms > 0) return [String(forms)];
  if (Array.isArray(forms)) {
    return forms
      .map((entry) => {
        if (typeof entry === "number" && entry > 0) return String(entry);
        if (entry && typeof entry === "object" && typeof (entry as JobFormRef).id === "number") {
          return String((entry as JobFormRef).id);
        }
        return "";
      })
      .filter((id) => id.length > 0);
  }
  if (typeof forms === "object" && typeof forms.id === "number" && forms.id > 0) {
    return [String(forms.id)];
  }
  return [];
}

export function mapJobFormToPayload(
  values: JobFormValues,
  options?: { compositeSellingPrice?: number | string | null },
): JobCreatePayload {
  const job_meta = buildJobMetaPayload({
    groupId: values.job_meta_group,
    compositeItemId: values.job_meta_composite_item_id,
    compositeQuantity: values.job_meta_composite_quantity,
    compositeSellingPrice: options?.compositeSellingPrice,
  });

  const payload: JobCreatePayload = {
    title: values.title.trim(),
    description: values.description.trim(),
    assigned_worker: Number.parseInt(values.assigned_worker, 10),
    start_date: htmlDatetimeLocalToIso(values.start_date),
  };

  const forms = parseFormIdList(values.forms);
  if (forms != null) payload.forms = forms;

  const job_status = parseOptionalIdField(values.job_status);
  if (job_status != null) payload.job_status = job_status;

  const client = parseOptionalIdField(values.client);
  if (client != null) payload.client = client;

  const project = parseOptionalIdField(values.project);
  if (project != null) payload.project = project;

  const site = parseOptionalIdField(values.site);
  if (site != null) payload.site = site;

  if (job_meta) payload.job_meta = job_meta;

  return payload;
}

export function emptyJobFormDefaults(): JobFormValues {
  return {
    title: "",
    description: "",
    forms: [],
    job_status: "",
    client: "",
    project: "",
    site: "",
    assigned_worker: "",
    start_date: "",
    job_meta_group: "",
    job_meta_composite_item_id: "",
    job_meta_composite_quantity: "",
  };
}

export function jobToFormDefaults(job: Job): JobFormValues {
  const meta = normalizeJobMeta(job.job_meta);
  const composite = meta?.composite_items?.[0];

  return {
    title: job.title ?? "",
    description: job.description ?? "",
    forms: jobFormsToFormIds(job.forms),
    job_status: String(
      typeof job.job_status === "number"
        ? job.job_status
        : job.job_status && typeof job.job_status === "object" && "id" in job.job_status
          ? (job.job_status as { id: number }).id
          : "",
    ),
    client: String(nestedId(job.client) ?? ""),
    project: String(nestedId(job.project) ?? ""),
    site: String(nestedId(job.site) ?? ""),
    assigned_worker: String(getJobAssignedWorkerId(job) ?? ""),
    start_date: formatApiDateTimeForHtmlDatetimeLocal(job.start_date),
    job_meta_group: meta?.group != null ? String(meta.group) : "",
    job_meta_composite_item_id: composite?.id != null ? String(composite.id) : "",
    job_meta_composite_quantity: composite?.quantity != null ? String(composite.quantity) : "",
  };
}
