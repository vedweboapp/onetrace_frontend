import { isUserGroupMockApiEnabled } from "@/features/user-groups/config/user-group-api.config";
import type {
  UserGroup,
  UserGroupCreatePayload,
  UserGroupUpdatePayload,
} from "@/features/user-groups/types/user-group.types";
import * as mockApi from "@/features/user-groups/api/user-group.mock.api";
import * as realApi from "@/features/user-groups/api/user-group.real.api";

const api = isUserGroupMockApiEnabled() ? mockApi : realApi;

export type { UserGroupListFilters } from "@/features/user-groups/api/user-group.real.api";

export const fetchUserGroupsPage = (
  page?: number,
  pageSize?: number,
  filters?: realApi.UserGroupListFilters,
) => api.fetchUserGroupsPage(page, pageSize, filters);

export const fetchUserGroup = (id: number): Promise<UserGroup> => api.fetchUserGroup(id);

export const createUserGroup = (body: UserGroupCreatePayload): Promise<UserGroup> => api.createUserGroup(body);

export const updateUserGroup = (id: number, body: UserGroupUpdatePayload): Promise<UserGroup> =>
  api.updateUserGroup(id, body);

export const deleteUserGroup = (id: number): Promise<void> => api.deleteUserGroup(id);
