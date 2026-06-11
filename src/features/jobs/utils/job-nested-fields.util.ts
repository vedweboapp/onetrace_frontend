import type {
  Job,
  JobClientRef,
  JobFormRef,
  JobFormRefApiRow,
  JobProjectRef,
  JobSiteRef,
} from "@/features/jobs/types/job.types";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import type { UserProfile } from "@/features/users/types/user.types";
import { jobFormsToFormIds } from "@/features/jobs/utils/job-form-map";

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
    if (typeof w.name === "string" && w.name.trim()) return w.name.trim();
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

export function jobClientLabel(client: Job["client"]): string {
  if (client && typeof client === "object" && typeof client.name === "string" && client.name.trim()) {
    return client.name.trim();
  }
  const id = typeof client === "number" ? client : (client as JobClientRef | undefined)?.id;
  return id != null ? `#${id}` : "—";
}

export function jobProjectLabel(project: Job["project"]): string {
  if (project && typeof project === "object" && typeof project.name === "string" && project.name.trim()) {
    return project.name.trim();
  }
  const id = typeof project === "number" ? project : (project as JobProjectRef | undefined)?.id;
  return id != null ? `#${id}` : "—";
}

export function jobSiteLabel(site: Job["site"]): string {
  if (site && typeof site === "object" && typeof site.site_name === "string" && site.site_name.trim()) {
    return site.site_name.trim();
  }
  const id = typeof site === "number" ? site : (site as JobSiteRef | undefined)?.id;
  return id != null ? `#${id}` : "—";
}

function normalizeJobFormRef(entry: JobFormRefApiRow): JobFormRef | null {
  const jobFormId =
    typeof entry.job_form_id === "number" && entry.job_form_id > 0
      ? entry.job_form_id
      : typeof entry.id === "number" && entry.id > 0
        ? entry.id
        : null;
  if (jobFormId == null) return null;

  const projectFormId =
    typeof entry.project_form_id === "number" && entry.project_form_id > 0
      ? entry.project_form_id
      : jobFormId;

  const submissionId =
    typeof entry.submission_id === "number" && entry.submission_id > 0
      ? entry.submission_id
      : typeof entry.submitted_form_id === "number" && entry.submitted_form_id > 0
        ? entry.submitted_form_id
        : null;

  const isSubmitted =
    typeof entry.is_submitted === "boolean" ? entry.is_submitted : submissionId != null;

  return {
    id: jobFormId,
    name: entry.name,
    project_form_id: projectFormId,
    is_submitted: isSubmitted,
    submitted_form_id: submissionId,
  };
}

export function jobFormEntries(job: Pick<Job, "forms">): JobFormRef[] {
  const forms = job.forms;
  if (forms == null) return [];

  if (typeof forms === "number") {
    return [{ id: forms, project_form_id: forms, is_submitted: false }];
  }

  if (Array.isArray(forms)) {
    return forms
      .map((entry): JobFormRef | null => {
        if (typeof entry === "number") {
          return { id: entry, project_form_id: entry, is_submitted: false };
        }
        if (typeof entry === "object" && entry !== null) {
          return normalizeJobFormRef(entry as JobFormRefApiRow);
        }
        return null;
      })
      .filter((e): e is JobFormRef => e !== null);
  }

  if (typeof forms === "object") {
    const normalized = normalizeJobFormRef(forms as JobFormRefApiRow);
    return normalized ? [normalized] : [];
  }

  return [];
}

export function jobFormsSummary(job: Pick<Job, "forms">): string {
  const entries = jobFormEntries(job);
  if (entries.length === 0) return "—";
  return entries
    .map((f) => (f.name?.trim() ? f.name.trim() : `#${f.id}`))
    .join(", ");
}

export function userProfileLabel(u: UserProfile): string {
  const full = `${u.user_detail.first_name ?? ""} ${u.user_detail.last_name ?? ""}`.trim();
  return full || u.user_detail.email?.trim() || `#${u.user_detail.id}`;
}
