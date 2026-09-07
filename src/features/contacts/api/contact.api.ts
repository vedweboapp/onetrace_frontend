import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import { CONTACT_PATHS } from "./contact.paths";
import type { Contact, ContactCreatePayload, ContactListResponse, ContactUpdatePayload } from "../types/contact.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type ContactListFilters = {
  search?: string;
  is_active?: boolean;
  contact_type?: "client" | "vendor";
  client?: number;
  vendor?: number;
};

export async function fetchContactsPage(
  page = 1,
  pageSize = 20,
  filters?: ContactListFilters,
): Promise<{ items: Contact[]; pagination: ContactListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);
  if (filters?.contact_type === "client" || filters?.contact_type === "vendor") {
    params.contact_type = filters.contact_type;
  }
  if (typeof filters?.client === "number" && Number.isFinite(filters.client) && filters.client > 0) {
    params.client = filters.client;
  }
  if (typeof filters?.vendor === "number" && Number.isFinite(filters.vendor) && filters.vendor > 0) {
    params.vendor = filters.vendor;
  }

  const { data } = await api.get<ContactListResponse>(CONTACT_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchAllContactIds(filters?: ContactListFilters): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchContactsPage(page, pageSize, filters));
}

export async function fetchContact(id: number): Promise<Contact> {
  const { data } = await api.get<ApiEnvelope<Contact>>(CONTACT_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createContact(body: ContactCreatePayload): Promise<Contact> {
  const { data } = await api.post<ApiEnvelope<Contact>>(CONTACT_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateContact(
  id: number,
  body: Partial<ContactUpdatePayload> & { is_active?: boolean },
): Promise<Contact> {
  const { data } = await api.patch<ApiEnvelope<Contact>>(CONTACT_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}
