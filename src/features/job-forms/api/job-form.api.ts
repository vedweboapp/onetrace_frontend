import api from "@/core/api/axios";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { getProjectJobForm } from "@/features/projects/api/project-job-form.api";
import type {
  JobFormSubmission,
  SubmitJobFormPayload,
} from "@/features/job-forms/types/job-form-submission.types";
import { normalizeProjectFormMetadataResponse } from "@/features/job-forms/utils/job-form-schema.util";
import { JOB_FORM_PATHS } from "./job-form.paths";

export async function fetchJobFormSchema(formId: number) {
  const raw = await getProjectJobForm(formId);
  return normalizeProjectFormMetadataResponse(raw);
}

export async function fetchJobSubmittedForms(jobId: number): Promise<JobFormSubmission[]> {
  const { data } = await api.get<ApiEnvelope<JobFormSubmission[]>>(
    JOB_FORM_PATHS.submittedList(jobId),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function fetchJobSubmittedForm(
  jobId: number,
  submissionId: number,
): Promise<JobFormSubmission> {
  const { data } = await api.get<ApiEnvelope<JobFormSubmission>>(
    JOB_FORM_PATHS.submittedDetail(jobId, submissionId),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function submitJobForm(
  jobId: number,
  payload: SubmitJobFormPayload,
): Promise<JobFormSubmission> {
  const { data } = await api.post<ApiEnvelope<JobFormSubmission>>(
    JOB_FORM_PATHS.submit(jobId),
    payload,
  );
  assertApiSuccess(data);
  return data.data;
}
