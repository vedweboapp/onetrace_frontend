import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { ITEM_PATHS } from "@/features/items/api/item.paths";
import type { Item, ItemCreatePayload, ItemListResponse, ItemUpdatePayload } from "@/features/items/types/item.types";

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

  const { data } = await api.get<ItemListResponse>(ITEM_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchItem(id: number): Promise<Item> {
  const { data } = await api.get<ApiEnvelope<Item>>(ITEM_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createItem(body: ItemCreatePayload): Promise<Item> {
  const { data } = await api.post<ApiEnvelope<Item>>(ITEM_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateItem(id: number, body: ItemUpdatePayload): Promise<Item> {
  const { data } = await api.patch<ApiEnvelope<Item>>(ITEM_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteItem(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(ITEM_PATHS.detail(id));
  assertApiSuccess(data);
}

