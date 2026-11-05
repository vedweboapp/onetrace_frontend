"use client";

import { WorkflowColourStatusSettingsPanel } from "@/shared/components/settings/workflow-colour-status-settings-panel";
import {
  createMaterialStatus,
  deleteMaterialStatus,
  fetchMaterialStatus,
  fetchMaterialStatusesPage,
  updateMaterialStatus,
} from "@/features/material-status/api/material-status.api";
import { routes } from "@/shared/config/routes";

const materialStatusApi = {
  fetchPage: fetchMaterialStatusesPage,
  fetch: fetchMaterialStatus,
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
        listPath: routes.dashboard.settingsMaterialStatus,
        api: materialStatusApi,
      }}
    />
  );
}
