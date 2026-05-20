"use client";

import { WorkflowColourStatusSettingsPanel } from "@/shared/components/settings/workflow-colour-status-settings-panel";
import {
  createJobStatus,
  deleteJobStatus,
  fetchJobStatusesPage,
  updateJobStatus,
} from "@/features/job-status/api/job-status.api";

const jobStatusApi = {
  fetchPage: fetchJobStatusesPage,
  create: createJobStatus,
  update: updateJobStatus,
  remove: deleteJobStatus,
};

export function JobStatusSettingsPanel() {
  return (
    <WorkflowColourStatusSettingsPanel
      config={{
        translationNamespace: "Dashboard.jobStatus",
        emptyStateIconName: "jobStatus",
        formTitleId: "job-status-form-title",
        api: jobStatusApi,
      }}
    />
  );
}
