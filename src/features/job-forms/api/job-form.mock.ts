import type {
  JobFormSubmission,
  SubmitJobFormPayload,
} from "@/features/job-forms/types/job-form-submission.types";
import { enrichSubmissionValues } from "@/features/job-forms/utils/job-form-values.util";
import {
  allocateJobFormSubmissionId,
  findSubmissionByJobFormId,
  getJobFormSubmission,
  listJobFormSubmissions,
  upsertJobFormSubmission,
} from "./job-form.mock-store";

export async function fetchJobSubmittedFormsMock(jobId: number): Promise<JobFormSubmission[]> {
  return listJobFormSubmissions(jobId);
}

export async function fetchJobSubmittedFormMock(
  jobId: number,
  submissionId: number,
): Promise<JobFormSubmission | null> {
  return getJobFormSubmission(jobId, submissionId);
}

export async function submitJobFormMock(
  jobId: number,
  payload: SubmitJobFormPayload,
  formName?: string | null,
): Promise<JobFormSubmission> {
  const now = new Date().toISOString();
  const existing = findSubmissionByJobFormId(jobId, payload.job_form_id);
  const values = enrichSubmissionValues(payload.values, new Map(), new Map()).map((row) => ({
    ...row,
    field_label: row.field_label ?? `Field ${row.field_id}`,
  }));

  if (existing) {
    const updated: JobFormSubmission = {
      ...existing,
      status: payload.status ?? "submitted",
      remarks: payload.remarks ?? existing.remarks ?? null,
      values,
      modified_at: now,
    };
    upsertJobFormSubmission(updated);
    return updated;
  }

  const row: JobFormSubmission = {
    id: allocateJobFormSubmissionId(),
    job_id: jobId,
    job_form_id: payload.job_form_id,
    form_id: payload.job_form_id,
    form_name: formName ?? null,
    status: payload.status ?? "submitted",
    remarks: payload.remarks ?? null,
    values,
    submitted_at: now,
    modified_at: now,
  };
  upsertJobFormSubmission(row);
  return row;
}
