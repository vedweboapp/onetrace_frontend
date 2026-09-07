import type { Job } from "@/features/jobs/types/job.types";
import type { MaterialRequestFormValues } from "@/features/material-requests/schemas/material-request-form-schema";

export function buildFormJobsFromJobIds(jobIds: number[]): MaterialRequestFormValues["jobs"] {
  return jobIds.map((id) => ({ job: String(id) }));
}

export function jobProjectLabel(job: Job): string {
  if (job.project && typeof job.project === "object") return job.project.name?.trim() || "—";
  return "—";
}

export function jobClientLabel(job: Job): string {
  if (job.client && typeof job.client === "object") return job.client.name?.trim() || "—";
  return "—";
}
