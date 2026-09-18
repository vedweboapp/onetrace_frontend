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
  try {
    const res = await api.get("/kiosks/", { params });
    const data = res.data;
    if (data && Array.isArray(data.results)) {
      return data;
    }
    if (Array.isArray(data)) {
      return {
        total_records: data.length,
        total_pages: 1,
        current_page: 1,
        page_size: params.page_size || 20,
        results: data,
      };
    }
    return {
      total_records: 0,
      total_pages: 1,
      current_page: 1,
      page_size: params.page_size || 20,
      results: [],
    };
  } catch (error) {
    // Return empty results gracefully if API endpoint is not yet created on backend
    return {
      total_records: 0,
      total_pages: 1,
      current_page: 1,
      page_size: params.page_size || 20,
      results: [],
    };
  }
}

export async function getKioskById(id: string | number): Promise<KioskConfig | null> {
  try {
    const res = await api.get(`/kiosks/${id}/`);
    return res.data;
  } catch (error) {
    return null;
  }
}

export async function createKiosk(payload: Partial<KioskConfig>): Promise<any> {
  const res = await api.post("/kiosks/", payload);
  return res.data;
}

export async function updateKiosk(id: string | number, payload: Partial<KioskConfig>): Promise<any> {
  const res = await api.put(`/kiosks/${id}/`, payload);
  return res.data;
}

export async function deleteKiosk(id: string | number): Promise<any> {
  const res = await api.delete(`/kiosks/${id}/`);
  return res.data;
}

export async function submitKioskResponse(
  payload: import("../types/kiosk-submission.types").KioskSubmissionPayload,
): Promise<any> {
  const res = await api.post("/kiosks/submissions/", payload);
  return res.data;
}
