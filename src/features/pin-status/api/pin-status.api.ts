import { fetchProjectStatusesPage } from "@/features/project-status/api/project-status.api";

export type PinStatusListFilters = {
  search?: string;
};

export const fetchPinStatusesPage = fetchProjectStatusesPage;
export {
  createProjectStatus as createPinStatus,
  deleteProjectStatus as deletePinStatus,
  updateProjectStatus as updatePinStatus,
} from "@/features/project-status/api/project-status.api";
