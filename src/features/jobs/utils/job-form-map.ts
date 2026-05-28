import { parseFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import type { Job, JobCreatePayload } from "@/features/jobs/types/job.types";
import type { JobFormValues } from "@/features/jobs/schemas/job-form-schema";
import { getJobAssignedWorkerId } from "@/features/jobs/utils/job-nested-fields.util";
import { buildJobMetaPayload } from "@/features/jobs/utils/job-meta-payload.util";

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

function nestedId(value: number | { id: number } | null | undefined): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "object" && typeof value.id === "number" && value.id > 0) return value.id;
  return undefined;
}

export function mapJobFormToPayload(
  values: JobFormValues,
  options?: { compositeSellingPrice?: number | string | null },
): JobCreatePayload {
  const endRaw = values.end_date.trim();
  const job_meta = buildJobMetaPayload({
    sectionName: values.job_meta_section_name,
    plotName: values.job_meta_plot_name,
    plotGroup: values.job_meta_plot_group,
    compositeItemId: values.job_meta_composite_item_id,
    compositeQuantity: values.job_meta_composite_quantity,
    compositeSellingPrice: options?.compositeSellingPrice,
  });

  const payload: JobCreatePayload = {
    title: values.title.trim(),
    description: values.description.trim(),
    assigned_worker: Number.parseInt(values.assigned_worker, 10),
    start_date: htmlDatetimeLocalToIso(values.start_date),
    is_active: values.is_active,
  };

  if (endRaw) payload.end_date = htmlDatetimeLocalToIso(endRaw);

  

  const forms = parseOptionalIdField(values.forms);
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
  
    forms: "",
    job_status: "",
    client: "",
    project: "",
    site: "",
    assigned_worker: "",
    start_date: "",
    end_date: "",
    is_active: true,
    job_meta_section_name: "",
    job_meta_plot_name: "",
    job_meta_plot_group: "",
    job_meta_composite_item_id: "",
    job_meta_composite_quantity: "",
  };
}

export function jobToFormDefaults(job: Job): JobFormValues {
  const meta = job.job_meta;
  const composite = meta?.plot?.composite_items?.[0];

  return {
    title: job.title ?? "",
    description: job.description ?? "",
    
    forms: String(nestedId(job.forms as number | { id: number } | undefined) ?? ""),
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
    end_date: formatApiDateTimeForHtmlDatetimeLocal(job.end_date),
    is_active: job.is_active ?? true,
    job_meta_section_name: meta?.section?.name ?? "",
    job_meta_plot_name: meta?.plot?.name ?? "",
    job_meta_plot_group: meta?.plot?.group != null ? String(meta.plot.group) : "",
    job_meta_composite_item_id: composite?.id != null ? String(composite.id) : "",
    job_meta_composite_quantity: composite?.quantity != null ? String(composite.quantity) : "",
  };
}
