import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { COMPOSITE_ITEM_PATHS } from "./composite-item.paths";
import type {
  CompositeItem,
  CompositeItemCreatePayload,
  CompositeItemListResponse,
  CompositeItemUpdatePayload,
} from "../types/composite-item.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type CompositeItemListFilters = {
  groupId?: number;
  search?: string;
};

export async function fetchCompositeItemsPage(
  page = 1,
  pageSize = 20,
  filters?: CompositeItemListFilters,
): Promise<{ items: CompositeItem[]; pagination: CompositeItemListResponse["pagination"] }> {
  const params: Record<string, string | number> = {
    page,
    page_size: pageSize,
    ...(filters?.groupId != null ? { group: filters.groupId } : {}),
  };
  const q = filters?.search?.trim();
  if (q) params.search = q;

  const { data } = await api.get<CompositeItemListResponse>(COMPOSITE_ITEM_PATHS.list, {
    params,
  });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchCompositeItem(id: number): Promise<CompositeItem> {
  const { data } = await api.get<ApiEnvelope<CompositeItem>>(COMPOSITE_ITEM_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createCompositeItem(body: CompositeItemCreatePayload): Promise<CompositeItem> {
  const { data } = await api.post<ApiEnvelope<CompositeItem>>(COMPOSITE_ITEM_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateCompositeItem(
  id: number,
  body: CompositeItemUpdatePayload,
): Promise<CompositeItem> {
  const { data } = await api.patch<ApiEnvelope<CompositeItem>>(COMPOSITE_ITEM_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteCompositeItem(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(COMPOSITE_ITEM_PATHS.detail(id));
  assertApiSuccess(data);
}
