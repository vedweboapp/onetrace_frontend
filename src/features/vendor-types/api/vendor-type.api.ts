import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { VENDOR_TYPE_PATHS } from "./vendor-type.paths";
import type {
  VendorType,
  VendorTypeCreatePayload,
  VendorTypeListResponse,
  VendorTypeUpdatePayload,
} from "../types/vendor-type.types";

type VendorTypeApiRow = VendorType & {
  bg_colour?: string | null;
  text_colour?: string | null;
};

function normalizeVendorType(row: VendorTypeApiRow): VendorType {
  return {
    ...row,
    name: row.name?.trim() ?? "",
    bg_color: row.bg_color ?? row.bg_colour ?? "",
    text_color: row.text_color ?? row.text_colour ?? "",
  };
}

function toVendorTypeWritePayload(
  body: VendorTypeCreatePayload | VendorTypeUpdatePayload,
): Record<string, unknown> {
  const src = body as VendorTypeCreatePayload &
    VendorTypeUpdatePayload & {
      bg_colour?: string;
      text_colour?: string;
    };
  const out: Record<string, unknown> = {};
  if (typeof src.name === "string") out.name = src.name;
  if (typeof src.is_active === "boolean") out.is_active = src.is_active;
  const bg = src.bg_color ?? src.bg_colour;
  const text = src.text_color ?? src.text_colour;
  if (typeof bg === "string") out.bg_color = bg;
  if (typeof text === "string") out.text_color = text;
  return out;
}

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type VendorTypeListFilters = {
  search?: string;
  is_active?: boolean;
};

export async function fetchVendorTypesPage(
  page = 1,
  pageSize = 20,
  filters?: VendorTypeListFilters,
): Promise<{ items: VendorType[]; pagination: VendorTypeListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);

  const { data } = await api.get<VendorTypeListResponse>(VENDOR_TYPE_PATHS.list, {
    params,
  });
  assertEnvelopeSuccess(data);
  return { items: data.data.map((row) => normalizeVendorType(row as VendorTypeApiRow)), pagination: data.pagination };
}

export async function fetchVendorType(id: number): Promise<VendorType> {
  const { data } = await api.get<ApiEnvelope<VendorType>>(VENDOR_TYPE_PATHS.detail(id));
  assertApiSuccess(data);
  return normalizeVendorType(data.data as VendorTypeApiRow);
}

export async function createVendorType(body: VendorTypeCreatePayload): Promise<VendorType> {
  const { data } = await api.post<ApiEnvelope<VendorType>>(
    VENDOR_TYPE_PATHS.list,
    toVendorTypeWritePayload(body),
  );
  assertApiSuccess(data);
  return normalizeVendorType(data.data as VendorTypeApiRow);
}

export async function updateVendorType(id: number, body: VendorTypeUpdatePayload): Promise<VendorType> {
  const { data } = await api.patch<ApiEnvelope<VendorType>>(
    VENDOR_TYPE_PATHS.detail(id),
    toVendorTypeWritePayload(body),
  );
  assertApiSuccess(data);
  return normalizeVendorType(data.data as VendorTypeApiRow);
}

export async function deleteVendorType(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(VENDOR_TYPE_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
