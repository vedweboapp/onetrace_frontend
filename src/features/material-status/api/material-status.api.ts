import { createWorkflowColourStatusApi } from "@/shared/api/create-workflow-colour-status.api";
import { resolveMaterialStatusRequestUrl } from "./material-status-http.util";
import { MATERIAL_STATUS_PATHS } from "./material-status.paths";

const materialStatusApi = createWorkflowColourStatusApi(
  MATERIAL_STATUS_PATHS,
  resolveMaterialStatusRequestUrl,
);

export type MaterialStatusListFilters = {
  search?: string;
};

export const fetchMaterialStatusesPage = materialStatusApi.fetchPage;
export const createMaterialStatus = materialStatusApi.create;
export const updateMaterialStatus = materialStatusApi.update;
export const deleteMaterialStatus = materialStatusApi.remove;
