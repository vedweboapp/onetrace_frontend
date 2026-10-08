import axios from "axios";
import api from "@/core/api/axios";
import type { CustomerOrder, CustomerOrderDetail, KioskConfig, KioskListItem } from "../types/kiosk.types";
import type { KioskCheckoutPayload, KioskCheckoutResponse } from "../types/kiosk-submission.types";
import { resolvePublicApiBaseUrl } from "@/core/config/api-url.util";
import { LinkService } from "react-pdf";

export interface GetKiosksParams {
  search?: string;
  page?: number;
  page_size?: number;
}

export interface GetKiosksResponse {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  results: KioskListItem[];
}

export type { CustomerOrder } from "../types/kiosk.types";

export interface GetCustomerOrdersParams {
  kiosk_id?: number | string;
  service_form?: number | string;
  page?: number;
  page_size?: number;
  search?: string;
}

export interface CustomerOrdersPagination {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next?: string | null;
  previous?: string | null;
}

export async function getCustomerOrders(params?: GetCustomerOrdersParams): Promise<{
  items: CustomerOrder[];
  pagination: CustomerOrdersPagination;
}> {
  const res = await api.get<any>("/customer-orders/", { params });
  const root = res.data;

  let items: CustomerOrder[] = [];
  let page_size = params?.page_size ?? 10;
  let current_page = params?.page ?? 1;
  let total_records = 0;
  let total_pages = 1;
  let next: string | null = null;
  let previous: string | null = null;

  if (root?.data && typeof root.data === "object" && !Array.isArray(root.data) && Array.isArray(root.data.data)) {
    // Nested envelope: { success, data: { success, data: [...], pagination: {...} } }
    items = root.data.data;
    const pag = root.data.pagination;
    total_records = pag?.total_records ?? pag?.count ?? items.length;
    total_pages = pag?.total_pages ?? Math.max(1, Math.ceil(total_records / page_size));
    current_page = pag?.current_page ?? current_page;
    page_size = pag?.page_size ?? page_size;
    next = pag?.next ?? null;
    previous = pag?.previous ?? null;
  } else if (Array.isArray(root?.data)) {
    // Single envelope: { success, data: [...], pagination: {...} }
    items = root.data;
    const pag = root.pagination;
    total_records = pag?.total_records ?? pag?.count ?? items.length;
    total_pages = pag?.total_pages ?? Math.max(1, Math.ceil(total_records / page_size));
    current_page = pag?.current_page ?? current_page;
    page_size = pag?.page_size ?? page_size;
    next = pag?.next ?? null;
    previous = pag?.previous ?? null;
  } else if (Array.isArray(root?.results)) {
    // DRF format: { count, next, previous, results: [...] }
    items = root.results;
    total_records = root.count ?? items.length;
    total_pages = Math.max(1, Math.ceil(total_records / page_size));
    next = root.next ?? null;
    previous = root.previous ?? null;
  } else if (Array.isArray(root)) {
    // Direct array
    items = root;
    total_records = root.length;
    total_pages = Math.max(1, Math.ceil(total_records / page_size));
  }

  return {
    items,
    pagination: {
      total_records,
      total_pages,
      current_page,
      page_size,
      next,
      previous,
    },
  };
}

export async function getCustomerOrderById(id: number | string): Promise<CustomerOrderDetail | null> {
  const res = await api.get<any>(`/customer-orders/${id}/`);
  const root = res.data;
  if (!root) return null;
  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    if (root.data.data && typeof root.data.data === "object" && !Array.isArray(root.data.data)) {
      return root.data.data as CustomerOrderDetail;
    }
    return root.data as CustomerOrderDetail;
  }
  return root as CustomerOrderDetail;
}

export async function getKiosksList(params: GetKiosksParams): Promise<GetKiosksResponse> {
  const res = await api.get("/service-forms/", { params });
  const data = res.data;

  // Shape: { success, message, data: [...], pagination: { count, next, previous } }
  if (data && Array.isArray(data.data)) {
    const total = data.pagination?.count ?? data.data.length;
    const pageSize = params.page_size || 20;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      total_records: total,
      total_pages: totalPages,
      current_page: params.page ?? 1,
      page_size: pageSize,
      results: data.data,
    };
  }

  // Django REST Framework paginated response: { count, next, previous, results }
  if (data && Array.isArray(data.results)) {
    const total = data.total_records ?? data.count ?? data.results.length;
    const totalPages = data.total_pages ?? Math.max(1, Math.ceil(total / (params.page_size || 20)));
    return {
      total_records: total,
      total_pages: totalPages,
      current_page: data.current_page ?? params.page ?? 1,
      page_size: data.page_size ?? params.page_size ?? 20,
      results: data.results,
    };
  }

  // Plain array response
  if (Array.isArray(data)) {
    return {
      total_records: data.length,
      total_pages: 1,
      current_page: 1,
      page_size: params.page_size || 20,
      results: data,
    };
  }

  // Unknown shape – return empty
  return {
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: params.page_size || 20,
    results: [],
  };
}

export async function getKioskById(id: string | number): Promise<KioskConfig | null> {
  try {
    const res = await api.get(`/service-forms/${id}/`);
    return res.data?.data ?? res.data;
  } catch {
    return null;
  }
}

export async function createKiosk(payload: FormData | Partial<KioskConfig>): Promise<any> {
  const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
  const res = await api.post("/service-forms/", payload, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return res.data;
}
 
export async function updateKiosk(
  id: string | number,
  payload: FormData | Partial<KioskConfig>,
): Promise<any> {
  const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
  const res = await api.put(`/service-forms/${id}/`, payload, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return res.data;
} 

export async function deleteKiosk(id: string | number): Promise<any> {
  const res = await api.delete(`/service-forms/${id}/`);
  return res.data;
}

/**
 * Submit checkout payload for public kiosk checkout.
 * Supports both multipart/form-data (FormData) and JSON payload.
 * POST /api/v1/checkout/
 */
export async function submitKioskCheckout(
  payload: FormData | KioskCheckoutPayload,
): Promise<KioskCheckoutResponse> {
  const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
  const res = await api.post<KioskCheckoutResponse>("/checkout/", payload, {
    headers: isFormData ? { "Content-Type": "multipart/form-data  " } : undefined,
  });
  return res.data;
}

/**
 * Payment / order status for the success card after Stripe.
 * GET /api/v1/order/{orderNumber}/payment-status/
 */
export async function fetchOrderPaymentStatus(orderNumber: string): Promise<unknown> {
  const encoded = encodeURIComponent(orderNumber.trim());
  const res = await api.get(`/order/${encoded}/payment-status/`, {
    skipErrorToast: true,
  });
  return res.data;
}

/**
 * Fetch a kiosk config via the public (unauthenticated) API endpoint.
 * Endpoint: /api/v1/public/{organization_uuid}/service-forms/{id}/
 */
export async function getPublicKioskById(
  organizationUuid: string,
  id: string | number,
): Promise<KioskConfig | null> {
  try {
    const baseUrl = resolvePublicApiBaseUrl();
    const res = await axios.get(
      `${baseUrl}/public/${organizationUuid}/service-forms/${id}/`,
    );
    return res.data?.data ?? res.data;
  } catch {
    return null;
  }
}
