import api from "@/core/api/axios";
import type { KioskConfig, KioskListItem } from "../types/kiosk.types";

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

export async function submitKioskResponse(
  payload: import("../types/kiosk-submission.types").KioskSubmissionPayload,
): Promise<any> {
  const res = await api.post("/service-forms/submissions/", payload);
  return res.data;
}
