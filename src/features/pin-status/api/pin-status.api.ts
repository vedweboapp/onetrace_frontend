import { createWorkflowColourStatusApi } from "@/shared/api/create-workflow-colour-status.api";
import { PIN_STATUS_PATHS } from "./pin-status.paths";

const pinStatusApi = createWorkflowColourStatusApi(PIN_STATUS_PATHS);

export type PinStatusListFilters = {
  search?: string;
};

export const fetchPinStatusesPage = pinStatusApi.fetchPage;
export const createPinStatus = pinStatusApi.create;
export const updatePinStatus = pinStatusApi.update;
export const deletePinStatus = pinStatusApi.remove;
