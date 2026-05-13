import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { CLIENT_PATHS } from "./client.paths";
import type {
  Client,
  ClientCreatePayload,
  ClientListResponse,
  ClientUpdatePayload,
} from "../types/client.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type ClientListFilters = {
  search?: string;
  is_active?: boolean;
};

type ClientRequestOptions = {
  silent?: boolean;
};

export async function fetchClientsPage(
  page = 1,
  pageSize = 20,
  filters?: ClientListFilters,
  options?: ClientRequestOptions,
): Promise<{ items: Client[]; pagination: ClientListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);

  const { data } = await api.get<ClientListResponse>(CLIENT_PATHS.list, {
    params,
    skipErrorToast: options?.silent === true,
  });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
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
