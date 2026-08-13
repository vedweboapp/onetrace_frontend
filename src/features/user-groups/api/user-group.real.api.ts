import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { USER_GROUP_PATHS } from "./user-group.paths";
import type {
  UserGroup,
  UserGroupCreatePayload,
  UserGroupListResponse,
  UserGroupUpdatePayload,
  UserGroupUserRef,
} from "../types/user-group.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function toMember(raw: unknown): UserGroupUserRef | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return { id: raw };
  }
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const nested =
    row.user_detail && typeof row.user_detail === "object"
      ? (row.user_detail as Record<string, unknown>)
      : null;
  const idRaw = row.id ?? row.user_id ?? nested?.id;
  const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    email: typeof row.email === "string" ? row.email : typeof nested?.email === "string" ? nested.email : null,
    username: typeof row.username === "string" ? row.username : null,
    first_name:
      typeof row.first_name === "string"
        ? row.first_name
        : typeof nested?.first_name === "string"
          ? nested.first_name
          : null,
    last_name:
      typeof row.last_name === "string"
        ? row.last_name
        : typeof nested?.last_name === "string"
          ? nested.last_name
          : null,
  };
}

function normalizeUserGroup(row: UserGroup & { user_ids?: unknown; members?: unknown }): UserGroup {
  const rawUsers = Array.isArray(row.users)
    ? row.users
    : Array.isArray(row.user_ids)
      ? row.user_ids
      : Array.isArray(row.members)
        ? row.members
        : [];
  const users = rawUsers.map(toMember).filter((u): u is UserGroupUserRef => u != null);
  return { ...row, users };
}

function toWritePayload(body: UserGroupCreatePayload | UserGroupUpdatePayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.name === "string") out.name = body.name;
  if (Array.isArray(body.users)) out.users = body.users;
  return out;
}

export type UserGroupListFilters = {
  search?: string;
};

export async function fetchUserGroupsPage(
  page = 1,
  pageSize = 20,
  filters?: UserGroupListFilters,
): Promise<{ items: UserGroup[]; pagination: UserGroupListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;

  const { data } = await api.get<UserGroupListResponse>(USER_GROUP_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return {
    items: data.data.map((row) => normalizeUserGroup(row)),
    pagination: data.pagination,
  };
}

export async function fetchUserGroup(id: number): Promise<UserGroup> {
  const { data } = await api.get<ApiEnvelope<UserGroup>>(USER_GROUP_PATHS.detail(id));
  assertApiSuccess(data);
  return normalizeUserGroup(data.data);
}

export async function createUserGroup(body: UserGroupCreatePayload): Promise<UserGroup> {
  const { data } = await api.post<ApiEnvelope<UserGroup>>(USER_GROUP_PATHS.list, toWritePayload(body));
  assertApiSuccess(data);
  return normalizeUserGroup(data.data);
}

export async function updateUserGroup(id: number, body: UserGroupUpdatePayload): Promise<UserGroup> {
  const { data } = await api.patch<ApiEnvelope<UserGroup>>(USER_GROUP_PATHS.detail(id), toWritePayload(body));
  assertApiSuccess(data);
  return normalizeUserGroup(data.data);
}

export async function deleteUserGroup(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(USER_GROUP_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
