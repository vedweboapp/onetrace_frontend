import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import {
  applyDropdownListParam,
  DROPDOWN_LIST_PAGE_SIZE,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
import { CLIENT_PATHS } from "./client.paths";
import type {
  Client,
  ClientCreatePayload,
  ClientListResponse,
  ClientUpdatePayload,
} from "../types/client.types";

export type ClientListFilters = {
  search?: string;
  is_active?: boolean;
  dropdown?: boolean;
};

type ClientRequestOptions = {
  silent?: boolean;
};

export async function fetchClientsPage(
  page = 1,
  pageSize = DROPDOWN_LIST_PAGE_SIZE,
  filters?: ClientListFilters,
  options?: ClientRequestOptions,
): Promise<{ items: Client[]; pagination: ClientListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    silent: options?.silent,
    fetchFirst: async () => {
      const { data } = await api.get<ClientListResponse>(CLIENT_PATHS.list, {
        params,
        skipErrorToast: options?.silent === true,
      });
      return parseListApiPage(data, pageSize);
    },
  });
}

export async function fetchAllClientIds(
  filters?: ClientListFilters,
  options?: ClientRequestOptions,
): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchClientsPage(page, pageSize, filters, options));
}

export async function fetchClient(id: number, options?: ClientRequestOptions): Promise<Client> {
  const { data } = await api.get<ApiEnvelope<Client>>(CLIENT_PATHS.detail(id), {
    skipErrorToast: options?.silent === true,
  });
  assertApiSuccess(data);
  return data.data;
}

export async function createClient(body: ClientCreatePayload): Promise<Client> {
  const { data } = await api.post<ApiEnvelope<Client>>(CLIENT_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateClient(
  id: number,
  body: Partial<ClientUpdatePayload> & { is_active?: boolean },
): Promise<Client> {
  const { data } = await api.patch<ApiEnvelope<Client>>(CLIENT_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteClient(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(CLIENT_PATHS.detail(id));
  assertApiSuccess(data);
}
