import axios from "axios";
import api from "@/core/api/axios";
import type { KioskConfig, KioskListItem } from "../types/kiosk.types";
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

export interface CustomerOrder {
  id: number;
  order_number?: string | null;
  customer?: { full_name?: string | null } | null;
  order_status?: string | null;
  created_at?: string | null;
}

interface CustomerOrdersResponse {
  data?: CustomerOrder[] | { data?: CustomerOrder[] };
}

export async function getCustomerOrders(): Promise<CustomerOrder[]> {
  const res = await api.get<CustomerOrdersResponse>("/customer-orders/");
  const payload = res.data?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
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
