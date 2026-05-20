import { parseFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import type { Job } from "@/features/jobs/types/job.types";
import type { JobFormValues } from "@/features/jobs/schemas/job-form-schema";
import type { JobCreatePayload } from "@/features/jobs/types/job.types";
import { getJobAssignedWorkerId } from "@/features/jobs/utils/job-nested-fields.util";

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

export function mapJobFormToPayload(values: JobFormValues): JobCreatePayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    assigned_worker: Number.parseInt(values.assigned_worker, 10),
    start_date: htmlDatetimeLocalToIso(values.start_date),
    end_date: htmlDatetimeLocalToIso(values.end_date),
    is_active: values.is_active,
  };
}

export function emptyJobFormDefaults(): JobFormValues {
  return {
    title: "",
    description: "",
    assigned_worker: "",
    start_date: "",
    end_date: "",
    is_active: true,
  };
}

export function jobToFormDefaults(job: Job): JobFormValues {
  return {
    title: job.title ?? "",
    description: job.description ?? "",
    assigned_worker: String(getJobAssignedWorkerId(job) ?? ""),
    start_date: formatApiDateTimeForHtmlDatetimeLocal(job.start_date),
    end_date: formatApiDateTimeForHtmlDatetimeLocal(job.end_date),
    is_active: job.is_active ?? true,
  };
}
