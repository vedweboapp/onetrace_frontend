"use client";

import { WorkflowColourStatusSettingsPanel } from "@/shared/components/settings/workflow-colour-status-settings-panel";
import {
  createJobStatus,
  deleteJobStatus,
  fetchJobStatus,
  fetchJobStatusesPage,
  updateJobStatus,
} from "@/features/job-status/api/job-status.api";
import { routes } from "@/shared/config/routes";

const jobStatusApi = {
  fetchPage: fetchJobStatusesPage,
  fetch: fetchJobStatus,
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
        listPath: routes.dashboard.settingsJobStatus,
        api: jobStatusApi,
      }}
    />
  );
}
