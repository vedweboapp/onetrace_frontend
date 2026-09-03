import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import { PURCHASE_ORDER_PATHS } from "./purchase-order.paths";
import type {
  PurchaseOrderCreatePayload,
  PurchaseOrderDetail,
  PurchaseOrderListItem,
  PurchaseOrderListResponse,
  PurchaseOrderUpdatePayload,
} from "../types/purchase-order.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type PurchaseOrderListFilters = {
  search?: string;
  status?: string;
  vendor?: number;
  issue_date?: string;
  due_date?: string;
};

export async function fetchPurchaseOrdersPage(
  page = 1,
  pageSize = 20,
  filters?: PurchaseOrderListFilters,
): Promise<{ items: PurchaseOrderListItem[]; pagination: PurchaseOrderListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (filters?.status?.trim()) params.status = filters.status.trim();
  if (typeof filters?.vendor === "number" && filters.vendor > 0) params.vendor = filters.vendor;
  if (filters?.issue_date?.trim()) params.issue_date = filters.issue_date.trim();
  if (filters?.due_date?.trim()) params.due_date = filters.due_date.trim();

  const { data } = await api.get<PurchaseOrderListResponse>(
    PURCHASE_ORDER_PATHS.list,
    { params },
  );
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchAllPurchaseOrderIds(filters?: PurchaseOrderListFilters): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchPurchaseOrdersPage(page, pageSize, filters));
}

export async function fetchPurchaseOrder(id: number, options?: { silent?: boolean }): Promise<PurchaseOrderDetail> {
  const { data } = await api.get<ApiEnvelope<PurchaseOrderDetail>>(PURCHASE_ORDER_PATHS.detail(id), {
    skipErrorToast: options?.silent === true,
  });
  assertApiSuccess(data);
  return data.data;
}

export async function createPurchaseOrder(body: PurchaseOrderCreatePayload): Promise<PurchaseOrderDetail> {
  const { data } = await api.post<ApiEnvelope<PurchaseOrderDetail>>(
    PURCHASE_ORDER_PATHS.list,
    body,
  );
  assertApiSuccess(data);
  return data.data;
}

export async function updatePurchaseOrder(
  id: number,
  body: PurchaseOrderUpdatePayload,
): Promise<PurchaseOrderDetail> {
  const { data } = await api.patch<ApiEnvelope<PurchaseOrderDetail>>(
    PURCHASE_ORDER_PATHS.detail(id),
    body,
  );
  assertApiSuccess(data);
  return data.data;
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(PURCHASE_ORDER_PATHS.detail(id));
  assertApiSuccess(data);
}
