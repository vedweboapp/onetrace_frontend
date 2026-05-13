import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { GROUP_PATHS } from "./group.paths";
import type {
  Group,
  GroupCreatePayload,
  GroupListResponse,
  GroupUpdatePayload,
} from "../types/group.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type GroupListFilters = {
  search?: string;
};

export async function fetchGroupsPage(
  page = 1,
  pageSize = 20,
  filters?: GroupListFilters,
): Promise<{ items: Group[]; pagination: GroupListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;

  const { data } = await api.get<GroupListResponse>(GROUP_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchGroup(id: number): Promise<Group> {
  const { data } = await api.get<ApiEnvelope<Group> | Group>(GROUP_PATHS.detail(id));
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<Group>);
    return (data as ApiEnvelope<Group>).data;
  }
  return data as Group;
}

export async function createGroup(body: GroupCreatePayload): Promise<Group> {
  const { data } = await api.post<ApiEnvelope<Group>>(GROUP_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateGroup(id: number, body: GroupUpdatePayload): Promise<Group> {
  const { data } = await api.patch<ApiEnvelope<Group>>(GROUP_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteGroup(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(GROUP_PATHS.detail(id));
  assertApiSuccess(data);
}
