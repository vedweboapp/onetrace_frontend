import type { Job } from "@/features/jobs/types/job.types";
import { getJobStatusRow } from "@/features/jobs/utils/job-nested-fields.util";
import type { DrawingPin } from "@/features/projects/types/drawing.types";

function normalizeStatusName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z]/g, "");
}

/** True when a workflow status name means Completed (pin or job). */
export function isCompletedStatusName(name: string | null | undefined): boolean {
  const n = normalizeStatusName(name ?? "");
  return n === "completed" || n === "complete" || n === "completado";
}

export function isPinStatusCompleted(pin: Pick<DrawingPin, "status_detail">): boolean {
  return isCompletedStatusName(pin.status_detail?.status_name);
}

export function isJobStatusCompleted(job: Pick<Job, "job_status">): boolean {
  return isCompletedStatusName(getJobStatusRow(job)?.status_name);
}

/** Pin is eligible for QA approve/reject selection. */
export function isPinEligibleForQualityAssurance(pin: DrawingPin): boolean {
  return isPinStatusCompleted(pin);
}
