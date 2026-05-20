"use client";

import { WorkflowColourStatusSettingsPanel } from "@/shared/components/settings/workflow-colour-status-settings-panel";
import {
  createPinStatus,
  deletePinStatus,
  fetchPinStatusesPage,
  updatePinStatus,
} from "@/features/pin-status/api/pin-status.api";

const pinStatusApi = {
  fetchPage: fetchPinStatusesPage,
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
        api: pinStatusApi,
      }}
    />
  );
}
