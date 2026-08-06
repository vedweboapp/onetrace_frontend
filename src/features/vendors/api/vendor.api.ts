import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import { VENDOR_PATHS } from "./vendor.paths";
import type {
  Vendor,
  VendorCreatePayload,
  VendorListResponse,
  VendorUpdatePayload,
} from "../types/vendor.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type VendorListFilters = {
  search?: string;
  is_active?: boolean;
};

export type VendorRequestOptions = {
  silent?: boolean;
};

export async function fetchVendorsPage(
  page = 1,
  pageSize = 20,
  filters?: VendorListFilters,
  options?: VendorRequestOptions,
): Promise<{ items: Vendor[]; pagination: VendorListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);

  const { data } = await api.get<VendorListResponse>(VENDOR_PATHS.list, {
    params,
    skipErrorToast: options?.silent === true,
  });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchAllVendorIds(
  filters?: VendorListFilters,
  options?: VendorRequestOptions,
): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchVendorsPage(page, pageSize, filters, options));
}

export async function fetchVendor(id: number): Promise<Vendor> {
  const { data } = await api.get<ApiEnvelope<Vendor>>(VENDOR_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createVendor(body: VendorCreatePayload): Promise<Vendor> {
  const { data } = await api.post<ApiEnvelope<Vendor>>(VENDOR_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateVendor(id: number, body: VendorUpdatePayload): Promise<Vendor> {
  const { data } = await api.patch<ApiEnvelope<Vendor>>(VENDOR_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteVendor(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(VENDOR_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
