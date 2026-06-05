import type { MaterialRequestCreatePayload, MaterialRequestDetail } from "@/features/material-requests/types/material-request.types";
import type { MaterialRequestFormValues } from "@/features/material-requests/schemas/material-request-form-schema";
import { nestedId } from "@/features/material-requests/utils/material-request-nested-fields.util";
import { formatApiDateForHtmlDateInput } from "@/shared/utils/api-date-parse.util";

export function emptyMaterialRequestFormDefaults(): MaterialRequestFormValues {
  return {
    worker_name: "",
    requested_date: "",
    status: "draft",
    jobs: [],
    items: [],
    notes: "",
  };
}

export function mapMaterialRequestFormToPayload(values: MaterialRequestFormValues): MaterialRequestCreatePayload {
  const jobs = values.jobs
    .map((row) => Number.parseInt(row.job.trim(), 10))
    .filter((id) => Number.isFinite(id) && id > 0)
    .map((job) => ({ job }));

  const items = values.items
    .map((row) => {
      const job = Number.parseInt(row.job.trim(), 10);
      const item = Number.parseInt(row.item.trim(), 10);
      const quantity = Number.parseFloat(row.quantity.trim());
      if (!Number.isFinite(job) || job <= 0) return null;
      if (!Number.isFinite(item) || item <= 0) return null;
      if (!Number.isFinite(quantity) || quantity <= 0) return null;
      return { job, item, quantity };
    })
    .filter((row): row is { job: number; item: number; quantity: number } => row != null);

  return {
    worker_name: Number.parseInt(values.worker_name.trim(), 10),
    requested_date: values.requested_date.trim(),
    status: values.status.trim() || "draft",
    jobs,
    items,
    notes: values.notes.trim() || undefined,
  };
}

export function materialRequestToFormDefaults(detail: MaterialRequestDetail): MaterialRequestFormValues {
  const jobIdSet = new Set<number>();
  for (const job of detail.jobs ?? []) {
    if (job.id > 0) jobIdSet.add(job.id);
  }
  for (const row of detail.items ?? []) {
    const jobId = nestedId(row.job);
    if (jobId != null) jobIdSet.add(jobId);
  }
  const jobs = [...jobIdSet].map((id) => ({ job: String(id) }));

  const items =
    detail.items && detail.items.length > 0
      ? detail.items.map((row) => ({
          job: String(nestedId(row.job) ?? ""),
          item: String(nestedId(row.item) ?? ""),
          quantity: String(
            row.quantity ??
              (row.item && typeof row.item === "object" ? row.item.quantity : undefined) ??
              1,
          ),
        }))
      : [];

  return {
    worker_name: String(nestedId(detail.worker_name) ?? ""),
    requested_date: formatApiDateForHtmlDateInput(detail.requested_date),
    status: detail.status ?? "draft",
    jobs,
    items,
    notes: detail.notes ?? "",
  };
}
