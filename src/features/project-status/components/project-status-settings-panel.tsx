"use client";

import { WorkflowColourStatusSettingsPanel } from "@/shared/components/settings/workflow-colour-status-settings-panel";
import {
  createProjectStatus,
  deleteProjectStatus,
  fetchProjectStatusesPage,
  updateProjectStatus,
} from "@/features/project-status/api/project-status.api";

const projectStatusApi = {
  fetchPage: fetchProjectStatusesPage,
  create: createProjectStatus,
  update: updateProjectStatus,
  remove: deleteProjectStatus,
};

export function ProjectStatusSettingsPanel() {
  return (
    <WorkflowColourStatusSettingsPanel
      config={{
        translationNamespace: "Dashboard.projectStatus",
        emptyStateIconName: "projectStatus",
        formTitleId: "project-status-form-title",
        api: projectStatusApi,
      }}
    />
  );
}
