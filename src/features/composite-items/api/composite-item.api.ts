import { createItem, deleteItem, fetchItem, fetchItemsPage, updateItem } from "@/features/items/api/item.api";
import type { ItemListFilters } from "@/features/items/api/item.api";
import type { ItemCreatePayload } from "@/features/items/types/item.types";
import type { CompositeItem, CompositeItemCreatePayload, CompositeItemListResponse, CompositeItemUpdatePayload } from "../types/composite-item.types";

export type CompositeItemListFilters = {
  search?: string;
};

export async function fetchCompositeItemsPage(
  page = 1,
  pageSize = 20,
  filters?: CompositeItemListFilters,
): Promise<{ items: CompositeItem[]; pagination: CompositeItemListResponse["pagination"] }> {
  const listFilters: ItemListFilters = {
    search: filters?.search,
    isComposite: true,
  };
  return await fetchItemsPage(page, pageSize, listFilters);
}

export async function fetchCompositeItem(id: number): Promise<CompositeItem> {
  return await fetchItem(id);
}

export async function createCompositeItem(body: CompositeItemCreatePayload): Promise<CompositeItem> {
  const payload: ItemCreatePayload = { ...(body as Omit<ItemCreatePayload, "is_composite">), is_composite: true };
  return await createItem(payload);
}

export async function updateCompositeItem(
  id: number,
  body: CompositeItemUpdatePayload,
): Promise<CompositeItem> {
  return await updateItem(id, body);
}

export async function deleteCompositeItem(id: number): Promise<void> {
  return await deleteItem(id);
}
