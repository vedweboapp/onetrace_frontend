import type { Job } from "@/features/jobs/types/job.types";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import type { UserProfile } from "@/features/users/types/user.types";

export function getJobAssignedWorkerId(job: Pick<Job, "assigned_worker">): number | null {
  const w = job.assigned_worker;
  if (typeof w === "number" && Number.isFinite(w)) return w;
  if (w && typeof w === "object" && typeof w.id === "number") return w.id;
  return null;
}

export function jobAssignedWorkerLabel(
  job: Pick<Job, "assigned_worker">,
  userLabelById?: Record<number, string>,
): string {
  const w = job.assigned_worker;
  if (w && typeof w === "object") {
    const full = `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim();
    if (full) return full;
    if (w.username?.trim()) return w.username.trim();
    if (w.email?.trim()) return w.email.trim();
  }
  const id = getJobAssignedWorkerId(job);
  if (id != null && userLabelById?.[id]) return userLabelById[id];
  return id != null ? `#${id}` : "—";
}

export function getJobStatusId(job: Pick<Job, "job_status">): number | null {
  const s = job.job_status;
  if (typeof s === "number" && Number.isFinite(s)) return s;
  if (s && typeof s === "object" && typeof s.id === "number") return s.id;
  return null;
}

export function getJobStatusRow(job: Pick<Job, "job_status">): WorkflowColourStatus | null {
  const s = job.job_status;
  if (s && typeof s === "object" && "status_name" in s) return s;
  return null;
}

export function userProfileLabel(u: UserProfile): string {
  const full = `${u.user_detail.first_name ?? ""} ${u.user_detail.last_name ?? ""}`.trim();
  return full || u.user_detail.email?.trim() || `#${u.user_detail.id}`;
}
