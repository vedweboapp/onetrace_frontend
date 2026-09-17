import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import {
  applyDropdownListParam,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
import { USER_PATHS } from "./user.paths";
import type {
  InviteUserPayload,
  Role,
  UpdateUserProfilePayload,
  UserListResponse,
  UserProfile,
} from "../types/user.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export async function fetchUsersPage(
  page = 1,
  pageSize = 20,
  filters?: {
    search?: string;
    role?: number | string;
    dropdown?: boolean;
    /** Follow cursor/next until exhausted (e.g. scheduling technician calendar). */
    fetchAllPages?: boolean;
  },
): Promise<{ items: UserProfile[]; pagination: UserListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.role === "number" && Number.isFinite(filters.role) && filters.role > 0) {
    params.role = filters.role;
  } else if (typeof filters?.role === "string" && filters.role.trim()) {
    params.role = filters.role.trim();
  }
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    fetchAllPages: filters?.fetchAllPages === true,
    fetchFirst: async () => {
      const { data } = await api.get<UserListResponse>(USER_PATHS.list, { params });
      return parseListApiPage(data, pageSize);
    },
  });
}

export async function fetchUserProfile(id: number): Promise<UserProfile> {
  const { data } = await api.get<ApiEnvelope<UserProfile> | UserProfile>(USER_PATHS.detail(id));
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<UserProfile>);
    return (data as ApiEnvelope<UserProfile>).data;
  }
  return data as UserProfile;
}

export async function inviteUser(body: InviteUserPayload): Promise<{ id: number; created_at: string }> {
  const { data } = await api.post<ApiEnvelope<{ id: number; created_at: string }>>(USER_PATHS.invite, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateUserProfile(id: number, body: UpdateUserProfilePayload): Promise<UserProfile> {
  const { data } = await api.patch<ApiEnvelope<UserProfile>>(USER_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function fetchRoles(): Promise<Role[]> {
  const { data } = await api.get<ApiEnvelope<Role[]> | { success: boolean; data: Role[] } | Role[]>(USER_PATHS.roles);
  if (Array.isArray(data)) return data;
  if ("success" in data && data.success === false) {
    throw new ApiBusinessError(
      typeof (data as { message?: string }).message === "string"
        ? (data as { message?: string }).message!
        : "Request failed",
    );
  }
  if ("data" in data && Array.isArray(data.data)) return data.data;
  return [];
}
