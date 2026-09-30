import axios from "axios";
import api from "@/core/api/axios";
import { resolvePublicApiBaseUrl } from "@/core/config/api-url.util";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import {
  applyDropdownListParam,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
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
  dropdown?: boolean;
};

export async function fetchGroupsPage(
  page = 1,
  pageSize = 20,
  filters?: GroupListFilters,
): Promise<{ items: Group[]; pagination: GroupListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    fetchFirst: async () => {
      const { data } = await api.get<GroupListResponse>(GROUP_PATHS.list, { params });
      return parseListApiPage(data, pageSize);
    },
  });
}

export async function fetchAllGroupIds(filters?: GroupListFilters): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchGroupsPage(page, pageSize, filters));
}

const groupDetailCache = new Map<string, Promise<Group>>();

export async function fetchGroup(id: number): Promise<Group> {
  const cacheKey = `auth:${id}`;
  if (groupDetailCache.has(cacheKey)) {
    return groupDetailCache.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const { data } = await api.get<ApiEnvelope<Group> | Group>(GROUP_PATHS.detail(id));
      if (data && typeof data === "object" && "success" in data) {
        assertApiSuccess(data as ApiEnvelope<Group>);
        return (data as ApiEnvelope<Group>).data;
      }
      return data as Group;
    } catch (err) {
      groupDetailCache.delete(cacheKey);
      throw err;
    }
  })();

  groupDetailCache.set(cacheKey, promise);
  return promise;
}

export async function createGroup(body: GroupCreatePayload): Promise<Group> {
  const { data } = await api.post<ApiEnvelope<Group>>(GROUP_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateGroup(id: number, body: GroupUpdatePayload): Promise<Group> {
  groupDetailCache.delete(`auth:${id}`);
  const { data } = await api.patch<ApiEnvelope<Group>>(GROUP_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteGroup(id: number): Promise<void> {
  groupDetailCache.delete(`auth:${id}`);
  const { data } = await api.delete<ApiEnvelope<unknown>>(GROUP_PATHS.detail(id));
  assertApiSuccess(data);
}

/**
 * Fetch a group via the public (unauthenticated) API endpoint.
 * Endpoint: /api/v1/public/{organization_uuid}/groups/{id}/
 */
export async function fetchPublicGroup(
  organizationUuid: string,
  id: number | string,
): Promise<Group> {
  const cacheKey = `public:${organizationUuid}:${id}`;
  if (groupDetailCache.has(cacheKey)) {
    return groupDetailCache.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const baseUrl = resolvePublicApiBaseUrl();
      const res = await axios.get(
        `${baseUrl}/public/${organizationUuid}/groups/${id}/`,
      );
      const data = res.data;
      if (data && typeof data === "object" && "success" in data) {
        return data.data as Group;
      }
      return data as Group;
    } catch (err) {
      groupDetailCache.delete(cacheKey);
      throw err;
    }
  })();

  groupDetailCache.set(cacheKey, promise);
  return promise;
}
