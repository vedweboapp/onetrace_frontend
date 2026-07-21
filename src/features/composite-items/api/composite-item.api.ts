import {
  createItem,
  deleteItem,
  fetchAllItemIds,
  fetchItem,
  fetchItemsPage,
  updateItem,
} from "@/features/items/api/item.api";
import type { ItemListFilters } from "@/features/items/api/item.api";
import type { ItemCreatePayload } from "@/features/items/types/item.types";
import type { ItemAttachmentWriteRef } from "@/features/items/utils/item-write-form-data.util";
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

export async function fetchAllCompositeItemIds(filters?: CompositeItemListFilters): Promise<number[]> {
  return fetchAllItemIds({ search: filters?.search, isComposite: true });
}

export async function fetchCompositeItem(id: number): Promise<CompositeItem> {
  return await fetchItem(id);
}


  

export async function createCompositeItem(
  body: CompositeItemCreatePayload,
  options?: { attachmentRefs?: ItemAttachmentWriteRef[] },
): Promise<CompositeItem> {
  const payload: ItemCreatePayload = { ...(body as Omit<ItemCreatePayload, "is_composite">), is_composite: true };
  return await createItem(payload, options);
}

export async function updateCompositeItem(
  id: number,
  body: CompositeItemUpdatePayload,
  options?: { attachmentRefs?: ItemAttachmentWriteRef[] },
): Promise<CompositeItem> {
  return await updateItem(id, body, options);
}

export async function deleteCompositeItem(id: number): Promise<void> {
  return await deleteItem(id);
}
