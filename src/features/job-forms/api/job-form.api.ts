import api from "@/core/api/axios";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { getProjectJobForm } from "@/features/projects/api/project-job-form.api";
import type {
  JobFormSubmission,
  SubmitJobFormPayload,
  SubmitJobFormSummary,
} from "@/features/job-forms/types/job-form-submission.types";
import { normalizeProjectFormMetadataResponse } from "@/features/job-forms/utils/job-form-schema.util";
import { JOB_FORM_PATHS } from "./job-form.paths";

export async function fetchJobFormSchema(formId: number) {
  const raw = await getProjectJobForm(formId);
  return normalizeProjectFormMetadataResponse(raw);
}

function normalizeSubmissionRow(
  row: JobFormSubmission & { submission_id?: number },
): JobFormSubmission {
  return {
    ...row,
    id: row.id ?? row.submission_id ?? 0,
    values: Array.isArray(row.values) ? row.values : [],
  };
}

export async function fetchJobSubmittedForms(jobId: number): Promise<JobFormSubmission[]> {
  const { data } = await api.get<ApiEnvelope<JobFormSubmission[]>>(
    JOB_FORM_PATHS.submittedList(jobId),
  );
  assertApiSuccess(data);
  return data.data.map((row) => normalizeSubmissionRow(row));
}

export async function fetchJobSubmittedForm(
  jobId: number,
  submissionId: number,
): Promise<JobFormSubmission> {
  const { data } = await api.get<ApiEnvelope<JobFormSubmission>>(
    JOB_FORM_PATHS.submittedDetail(jobId, submissionId),
  );
  assertApiSuccess(data);
  return normalizeSubmissionRow({ ...data.data, id: data.data.id ?? submissionId });
}

/** List rows often omit `values`; load detail when we have a submission id. */
export async function resolveSubmissionWithValues(
  jobId: number,
  row: JobFormSubmission | null | undefined,
): Promise<JobFormSubmission | null> {
  if (!row) return null;
  if (Array.isArray(row.values) && row.values.length > 0) return row;
  if (!row.id || row.id <= 0) return row;
  try {
    return await fetchJobSubmittedForm(jobId, row.id);
  } catch {
    return row;
  }
}

function submissionMatchesJobForm(
  row: JobFormSubmission,
  jobFormId: number,
  projectFormId: number,
): boolean {
  if (Number.isFinite(jobFormId) && jobFormId > 0 && row.job_form_id === jobFormId) return true;
  if (projectFormId > 0) {
    if (row.project_form_id === projectFormId) return true;
    if (row.form_id === projectFormId) return true;
  }
  return false;
}

/** Resolve an existing submission for a job form (list summary → detail). */
export async function loadJobFormSubmission(
  jobId: number,
  jobFormId: number,
  projectFormId: number,
  submissionIdHint?: number,
): Promise<JobFormSubmission | null> {
  if (submissionIdHint != null && submissionIdHint > 0) {
    try {
      const detail = await fetchJobSubmittedForm(jobId, submissionIdHint);
      return normalizeSubmission(detail, jobId, jobFormId, projectFormId);
    } catch {
      // Fall back to list lookup.
    }
  }

  let rows: JobFormSubmission[] = [];
  try {
    rows = await fetchJobSubmittedForms(jobId);
  } catch {
    return null;
  }

  const summary =
    rows.find((row) => submissionMatchesJobForm(row, jobFormId, projectFormId)) ?? null;
  const resolved = await resolveSubmissionWithValues(jobId, summary);
  if (!resolved) return null;
  return normalizeSubmission(resolved, jobId, jobFormId, projectFormId);
}

function isSubmitSummary(
  row: JobFormSubmission | SubmitJobFormSummary,
): row is SubmitJobFormSummary {
  return "submission_id" in row && !("values" in row);
}

function normalizeSubmission(
  row: JobFormSubmission,
  jobId: number,
  jobFormId: number,
  projectFormId: number,
): JobFormSubmission {
  return {
    ...row,
    id: row.id ?? (row as SubmitJobFormSummary).submission_id,
    job_id: row.job_id ?? jobId,
    job_form_id: row.job_form_id ?? jobFormId,
    form_id: row.form_id ?? row.project_form_id ?? projectFormId,
    project_form_id: row.project_form_id ?? row.form_id ?? projectFormId,
    values: row.values ?? [],
  };
}

export async function submitJobForm(
  jobId: number,
  payload: SubmitJobFormPayload,
  projectFormId?: number,
): Promise<JobFormSubmission> {
  const { data } = await api.post<ApiEnvelope<JobFormSubmission | SubmitJobFormSummary>>(
    JOB_FORM_PATHS.submit(jobId),
    payload,
  );
  assertApiSuccess(data);
  const body = data.data;
  if (isSubmitSummary(body)) {
    try {
      const detail = await fetchJobSubmittedForm(jobId, body.submission_id);
      return normalizeSubmission(
        detail,
        jobId,
        payload.job_form_id,
        projectFormId ?? body.project_form_id,
      );
    } catch {
      return {
        id: body.submission_id,
        job_id: body.job_id,
        job_form_id: payload.job_form_id,
        form_id: body.project_form_id,
        project_form_id: body.project_form_id,
        status: payload.status ?? "submitted",
        values: [],
      };
    }
  }
  return normalizeSubmission(
    body,
    jobId,
    payload.job_form_id,
    projectFormId ?? body.project_form_id ?? body.form_id,
  );
}
