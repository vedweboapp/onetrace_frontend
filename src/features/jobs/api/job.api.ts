import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { JOB_PATHS } from "./job.paths";
import type {
  Job,
  JobCreateFromQuotationPayload,
  JobCreatePayload,
  JobListResponse,
  JobMassUpdatePayload,
  JobUpdatePayload,
} from "../types/job.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type JobListFilters = {
  search?: string;
  is_active?: boolean;
  job_status?: number;
  assigned_worker?: number;
};

type JobRequestOptions = {
  silent?: boolean;
};

export async function fetchJobsPage(
  page = 1,
  pageSize = 20,
  filters?: JobListFilters,
  options?: JobRequestOptions,
): Promise<{ items: Job[]; pagination: JobListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);
  if (typeof filters?.job_status === "number" && Number.isFinite(filters.job_status)) {
    params.job_status = filters.job_status;
  }
  if (typeof filters?.assigned_worker === "number" && Number.isFinite(filters.assigned_worker)) {
    params.assigned_worker = filters.assigned_worker;
  }

  const { data } = await api.get<JobListResponse>(JOB_PATHS.list, {
    params,
    skipErrorToast: options?.silent === true,
  });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchJob(id: number, options?: JobRequestOptions): Promise<Job> {
  const { data } = await api.get<ApiEnvelope<Job>>(JOB_PATHS.detail(id), {
    skipErrorToast: options?.silent === true,
  });
  assertApiSuccess(data);
  return data.data;
}

function parseJobCreateResponse(data: ApiEnvelope<Job> | JobListResponse): Job {
  if ("pagination" in data && Array.isArray(data.data) && data.data[0]) {
    assertEnvelopeSuccess(data);
    return data.data[0];
  }
  assertApiSuccess(data as ApiEnvelope<Job>);
  return (data as ApiEnvelope<Job>).data;
}

export async function createJob(body: JobCreatePayload): Promise<Job> {
  const { data } = await api.post<ApiEnvelope<Job> | JobListResponse>(JOB_PATHS.list, body);
  return parseJobCreateResponse(data);
}

/** Backend creates a job from a quotation. */
export async function createJobFromQuotation(quotationId: number): Promise<Job> {
  const body: JobCreateFromQuotationPayload = { quotation_id: quotationId };
  const { data } = await api.post<ApiEnvelope<Job> | JobListResponse>(JOB_PATHS.createFromQuotation, body);
  return parseJobCreateResponse(data);
}

export async function updateJob(id: number, body: JobUpdatePayload): Promise<Job> {
  const { data } = await api.patch<ApiEnvelope<Job>>(JOB_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteJob(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(JOB_PATHS.detail(id));
  assertApiSuccess(data);
}

export async function massUpdateJobs(body: JobMassUpdatePayload): Promise<void> {
  const { data } = await api.post<ApiEnvelope<unknown>>(JOB_PATHS.list, body);
  assertApiSuccess(data);
}
