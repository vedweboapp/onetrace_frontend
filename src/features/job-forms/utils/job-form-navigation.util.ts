import type { JobFormRef } from "@/features/jobs/types/job.types";
import { routes } from "@/shared/config/routes";

const JOB_FORMS_STORAGE_PREFIX = "job_forms_";

export function saveJobFormsToSessionStorage(jobId: number | string, forms: JobFormRef[]): void {
  if (typeof window === "undefined" || !jobId || !Array.isArray(forms)) return;
  try {
    sessionStorage.setItem(`${JOB_FORMS_STORAGE_PREFIX}${jobId}`, JSON.stringify(forms));
  } catch (e) {
    console.warn("Failed to save job forms to sessionStorage", e);
  }
}

export function loadJobFormsFromSessionStorage(jobId: number | string): JobFormRef[] {
  if (typeof window === "undefined" || !jobId) return [];
  try {
    const raw = sessionStorage.getItem(`${JOB_FORMS_STORAGE_PREFIX}${jobId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Failed to load job forms from sessionStorage", e);
    return [];
  }
}

export function clearJobFormsFromSessionStorage(jobId: number | string): void {
  if (typeof window === "undefined" || !jobId) return;
  try {
    sessionStorage.removeItem(`${JOB_FORMS_STORAGE_PREFIX}${jobId}`);
  } catch (e) {
    console.warn("Failed to clear job forms from sessionStorage", e);
  }
}

export function buildJobFormFillUrl(
  jobId: number | string,
  form: JobFormRef,
  backHref?: string,
  submissionIdFallback?: number | null,
): string {
  const label = form.name?.trim() || `#${form.project_form_id}`;
  const base = routes.dashboard.jobFormFill(jobId, form.project_form_id, form.id);
  const params = new URLSearchParams();
  params.set("name", label);
  if (backHref) {
    params.set("back", backHref);
  }
  const sid =
    typeof form.submitted_form_id === "number" && form.submitted_form_id > 0
      ? form.submitted_form_id
      : form.is_submitted && submissionIdFallback != null && submissionIdFallback > 0
        ? submissionIdFallback
        : null;
  if (sid != null) {
    params.set("submission_id", String(sid));
  }
  if (form.dynamic_form_id != null && String(form.dynamic_form_id).trim() !== "") {
    params.set("dynamic_form_id", String(form.dynamic_form_id));
  }
  const query = params.toString();
  return query ? `${base}&${query}` : base;
}
