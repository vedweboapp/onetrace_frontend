import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import type { EntityAttachmentWriteRef } from "@/shared/attachments/entity-attachment.types";
import { updateEntityAttachments } from "@/shared/attachments/update-entity-attachments.util";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import {
  applyDropdownListParam,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
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
  dropdown?: boolean;
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
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    silent: options?.silent,
    fetchFirst: async () => {
      const { data } = await api.get<VendorListResponse>(VENDOR_PATHS.list, {
        params,
        skipErrorToast: options?.silent === true,
      });
      return parseListApiPage(data, pageSize);
    },
  });
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

/** GET vendors/{id}/approved-quotations/ */
export async function fetchVendorApprovedQuotations(vendorId: number): Promise<unknown> {
  const { data } = await api.get(VENDOR_PATHS.approvedQuotations(vendorId), {
    skipErrorToast: true,
  });
  return data;
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

import type { VendorFolder } from "@/features/vendors/types/vendor-folder.types";

export async function fetchVendorFolders(id: number): Promise<VendorFolder[]> {
  try {
    const { data } = await api.get<ApiEnvelope<VendorFolder[]> | VendorFolder[]>(VENDOR_PATHS.folders(id));
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "data" in data && Array.isArray(data.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

export async function createVendorFolder(entityId: number, name: string): Promise<VendorFolder> {
  const { data } = await api.post<ApiEnvelope<VendorFolder> | VendorFolder>(VENDOR_PATHS.folders(entityId), { name });
  if (data && typeof data === "object" && "data" in data && data.data) return data.data;
  return data as VendorFolder;
}

export async function updateVendorFolder(entityId: number, folderId: number, name: string): Promise<VendorFolder> {
  const { data } = await api.patch<ApiEnvelope<VendorFolder> | VendorFolder>(VENDOR_PATHS.folderDetail(entityId, folderId), { name });
  if (data && typeof data === "object" && "data" in data && data.data) return data.data;
  return data as VendorFolder;
}

export async function deleteVendorFolder(entityId: number, folderId: number): Promise<void> {
  await api.delete(VENDOR_PATHS.folderDetail(entityId, folderId));
}

export async function updateVendorAttachments(
  id: number,
  refs: EntityAttachmentWriteRef[],
  options?: { folderId?: number | null },
): Promise<Vendor> {
  return updateEntityAttachments<Vendor>(VENDOR_PATHS.detail(id), refs, options);
}

export async function deleteVendor(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(VENDOR_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
