import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { ITEM_PATHS } from "@/features/items/api/item.paths";
import type { Item, ItemCreatePayload, ItemListResponse, ItemUpdatePayload } from "@/features/items/types/item.types";
import type { ItemAttachmentWriteRef } from "@/features/items/utils/item-write-form-data.util";
import { buildItemWriteBody } from "@/features/items/utils/item-write-form-data.util";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type ItemListFilters = {
  search?: string;
  isActive?: boolean;
  isComposite?: boolean;
  groupId?: number;
  /** Filter items linked to a vendor (`item/?vendor_id=`). */
  vendorId?: number;
};

export async function fetchItemsPage(
  page = 1,
  pageSize = 20,
  filters?: ItemListFilters,
): Promise<{ items: Item[]; pagination: ItemListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = {
    page,
    page_size: pageSize,
  };

  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (filters?.isActive != null) params.is_active = filters.isActive;
  if (filters?.isComposite != null) params.is_composite = filters.isComposite;
  if (filters?.groupId != null) params.group = filters.groupId;
  if (typeof filters?.vendorId === "number" && Number.isFinite(filters.vendorId) && filters.vendorId > 0) {
    params.vendor_id = filters.vendorId;
  }

  const { data } = await api.get<ItemListResponse>(ITEM_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchAllItemIds(filters?: ItemListFilters): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchItemsPage(page, pageSize, filters));
}

export async function fetchItem(id: number): Promise<Item> {
  const { data } = await api.get<ApiEnvelope<Item>>(ITEM_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createItem(
  body: ItemCreatePayload,
  options?: { attachmentRefs?: ItemAttachmentWriteRef[] },
): Promise<Item> {
  const payload = buildItemWriteBody(body, options?.attachmentRefs);
  const { data } = await api.post<ApiEnvelope<Item>>(ITEM_PATHS.list, payload);
  assertApiSuccess(data);
  return data.data;
}

export async function updateItem(
  id: number,
  body: ItemUpdatePayload,
  options?: { attachmentRefs?: ItemAttachmentWriteRef[] },
): Promise<Item> {
  const payload = buildItemWriteBody(body, options?.attachmentRefs);
  const { data } = await api.patch<ApiEnvelope<Item>>(ITEM_PATHS.detail(id), payload);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteItem(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(ITEM_PATHS.detail(id));
  assertApiSuccess(data);
}

