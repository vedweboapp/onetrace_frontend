"use client";

import { WorkflowColourStatusSettingsPanel } from "@/shared/components/settings/workflow-colour-status-settings-panel";
import {
  createPinStatus,
  deletePinStatus,
  fetchPinStatus,
  fetchPinStatusesPage,
  updatePinStatus,
} from "@/features/pin-status/api/pin-status.api";
import { routes } from "@/shared/config/routes";

const pinStatusApi = {
  fetchPage: fetchPinStatusesPage,
  fetch: fetchPinStatus,
  create: createPinStatus,
  update: updatePinStatus,
  remove: deletePinStatus,
};

export function PinStatusSettingsPanel() {
  return (
    <WorkflowColourStatusSettingsPanel
      config={{
        translationNamespace: "Dashboard.pinStatus",
        emptyStateIconName: "pinStatus",
        formTitleId: "pin-status-form-title",
        listPath: routes.dashboard.settingsPinStatus,
        api: pinStatusApi,
      }}
    />
  );
}
