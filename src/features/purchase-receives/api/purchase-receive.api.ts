import api from "@/core/api/axios";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import { parseListApiPage } from "@/shared/utils/list-dropdown-fetch.util";
import { PURCHASE_RECEIVE_PATHS } from "./purchase-receive.paths";
import type {
  PurchaseReceiveCreatePayload,
  PurchaseReceiveDetail,
  PurchaseReceiveListItem,
  PurchaseReceiveListResponse,
  PurchaseReceiveUpdatePayload,
} from "../types/purchase-receive.types";

export type PurchaseReceiveListFilters = {
  search?: string;
  purchase_receive_number?: string;
  tracking_number?: string;
  status?: string;
  vendor?: number;
  purchase_order?: number;
};

export async function fetchPurchaseReceivesPage(
  page = 1,
  pageSize = 20,
  filters?: PurchaseReceiveListFilters,
): Promise<{ items: PurchaseReceiveListItem[]; pagination: PurchaseReceiveListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (filters?.purchase_receive_number?.trim()) {
    params.purchase_receive_number = filters.purchase_receive_number.trim();
  }
  if (filters?.tracking_number?.trim()) params.tracking_number = filters.tracking_number.trim();
  if (filters?.status?.trim()) params.status = filters.status.trim();
  if (typeof filters?.vendor === "number" && filters.vendor > 0) params.vendor = filters.vendor;
  if (typeof filters?.purchase_order === "number" && filters.purchase_order > 0) {
    params.purchase_order = filters.purchase_order;
  }

  const { data } = await api.get<PurchaseReceiveListResponse>(PURCHASE_RECEIVE_PATHS.list, { params });
  return parseListApiPage(data, pageSize);
}

export async function fetchAllPurchaseReceiveIds(filters?: PurchaseReceiveListFilters): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchPurchaseReceivesPage(page, pageSize, filters));
}

export async function fetchPurchaseReceive(
  id: number,
  options?: { silent?: boolean },
): Promise<PurchaseReceiveDetail> {
  const { data } = await api.get<ApiEnvelope<PurchaseReceiveDetail>>(PURCHASE_RECEIVE_PATHS.detail(id), {
    skipErrorToast: options?.silent === true,
  });
  assertApiSuccess(data);
  return data.data;
}

export async function createPurchaseReceive(
  body: PurchaseReceiveCreatePayload,
): Promise<PurchaseReceiveDetail> {
  const { data } = await api.post<ApiEnvelope<PurchaseReceiveDetail>>(PURCHASE_RECEIVE_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updatePurchaseReceive(
  id: number,
  body: PurchaseReceiveUpdatePayload,
): Promise<PurchaseReceiveDetail> {
  const { data } = await api.patch<ApiEnvelope<PurchaseReceiveDetail>>(
    PURCHASE_RECEIVE_PATHS.detail(id),
    body,
  );
  assertApiSuccess(data);
  return data.data;
}

export async function deletePurchaseReceive(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(PURCHASE_RECEIVE_PATHS.detail(id));
  assertApiSuccess(data);
}
