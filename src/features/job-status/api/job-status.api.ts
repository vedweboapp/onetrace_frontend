import { createWorkflowColourStatusApi } from "@/shared/api/create-workflow-colour-status.api";
import { JOB_STATUS_PATHS } from "./job-status.paths";

const jobStatusApi = createWorkflowColourStatusApi(JOB_STATUS_PATHS);

export type JobStatusListFilters = {
  search?: string;
};

export const fetchJobStatusesPage = jobStatusApi.fetchPage;
export const createJobStatus = jobStatusApi.create;
export const updateJobStatus = jobStatusApi.update;
export const deleteJobStatus = jobStatusApi.remove;
