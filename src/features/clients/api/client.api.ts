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
};

export async function fetchClientsPage(
  page = 1,
  pageSize = 20,
  filters?: ClientListFilters,
): Promise<{ items: Client[]; pagination: ClientListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;

  const { data } = await api.get<ClientListResponse>(CLIENT_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchClient(id: number): Promise<Client> {
  const { data } = await api.get<ApiEnvelope<Client>>(CLIENT_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createClient(body: ClientCreatePayload): Promise<Client> {
  const { data } = await api.post<ApiEnvelope<Client>>(CLIENT_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateClient(id: number, body: ClientUpdatePayload): Promise<Client> {
  const { data } = await api.patch<ApiEnvelope<Client>>(CLIENT_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}
