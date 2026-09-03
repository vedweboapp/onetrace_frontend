"use client";

import { WorkflowColourStatusSettingsPanel } from "@/shared/components/settings/workflow-colour-status-settings-panel";
import {
  createMaterialStatus,
  deleteMaterialStatus,
  fetchMaterialStatusesPage,
  updateMaterialStatus,
} from "@/features/material-status/api/material-status.api";

const materialStatusApi = {
  fetchPage: fetchMaterialStatusesPage,
  create: createMaterialStatus,
  update: updateMaterialStatus,
  remove: deleteMaterialStatus,
};

export function MaterialStatusSettingsPanel() {
  return (
    <WorkflowColourStatusSettingsPanel
      config={{
        translationNamespace: "Dashboard.materialStatus",
        emptyStateIconName: "materialStatus",
        formTitleId: "material-status-form-title",
        api: materialStatusApi,
      }}
    />
  );
}
