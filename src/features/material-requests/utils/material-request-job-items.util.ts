import type { Job } from "@/features/jobs/types/job.types";
import {
  normalizeJobMeta,
  resolveJobMetaCompositeItemId,
} from "@/features/jobs/utils/job-meta-payload.util";
import type { MaterialRequestFormValues } from "@/features/material-requests/schemas/material-request-form-schema";

export type MaterialRequestFormItemRow = MaterialRequestFormValues["items"][number];

/** @deprecated Use resolveJobMetaCompositeItemId */
export const resolveCompositeItemId = resolveJobMetaCompositeItemId;

export function buildFormJobsFromJobIds(jobIds: number[]): MaterialRequestFormValues["jobs"] {
  return jobIds.map((id) => ({ job: String(id) }));
}

export function buildFormItemsFromJobs(jobs: Job[]): MaterialRequestFormItemRow[] {
  const qtyByItem = new Map<number, number>();

  for (const job of jobs) {
    const meta = normalizeJobMeta(job.job_meta);
    for (const row of meta?.composite_items ?? []) {
      const itemId = resolveJobMetaCompositeItemId(row);
      if (itemId == null) continue;
      const qty = row.quantity != null && Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1;
      qtyByItem.set(itemId, (qtyByItem.get(itemId) ?? 0) + qty);
    }
  }

  return [...qtyByItem.entries()].map(([itemId, qty]) => ({
    job: "",
    item: String(itemId),
    quantity: Number.isInteger(qty) ? String(qty) : qty.toFixed(2),
  }));
}

export function jobProjectLabel(job: Job): string {
  if (job.project && typeof job.project === "object") return job.project.name?.trim() || "—";
  return "—";
}

export function jobClientLabel(job: Job): string {
  if (job.client && typeof job.client === "object") return job.client.name?.trim() || "—";
  return "—";
}
