import type { MaterialRequestCreatePayload, MaterialRequestDetail } from "@/features/material-requests/types/material-request.types";
import type { MaterialRequestFormValues } from "@/features/material-requests/schemas/material-request-form-schema";
import {
  nestedId,
  normalizeMaterialRequestStatus,
} from "@/features/material-requests/utils/material-request-nested-fields.util";
import { formatApiDateForHtmlDateInput } from "@/shared/utils/api-date-parse.util";

export function emptyMaterialRequestFormDefaults(): MaterialRequestFormValues {
  return {
    worker_name: "",
    requested_date: "",
    status: "draft",
    jobs: [],
    notes: "",
  };
}

/** Submit jobs only — backend derives line items from job scope. */
export function mapMaterialRequestFormToPayload(values: MaterialRequestFormValues): MaterialRequestCreatePayload {
  const jobs = values.jobs
    .map((row) => Number.parseInt(row.job.trim(), 10))
    .filter((id) => Number.isFinite(id) && id > 0)
    .map((job) => ({ job }));

  return {
    worker_name: Number.parseInt(values.worker_name.trim(), 10),
    requested_date: values.requested_date.trim(),
    status: values.status.trim() || "draft",
    jobs,
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

  return {
    worker_name: String(nestedId(detail.worker_name) ?? ""),
    requested_date: formatApiDateForHtmlDateInput(detail.requested_date),
    status: normalizeMaterialRequestStatus(detail.status) || "draft",
    jobs,
    notes: detail.notes ?? "",
  };
}
