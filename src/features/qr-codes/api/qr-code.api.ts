import api from "@/core/api/axios";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import { QR_CODE_PATHS } from "./qr-code.paths";
import type { QrCode, QrCodeGeneratePayload, QrCodePagination } from "../types/qr-code.types";
import type { QrCodeStatus } from "../types/qr-code.types";
import {
  parseQrCodeDeleteResponse,
  parseQrCodeEntity,
  parseQrCodeGenerateResponse,
  parseQrCodeListResponse,
} from "../utils/qr-code-response.util";

export type QrCodeListFilters = {
  search?: string;
  status?: QrCodeStatus;
  assigned_to_id?: number;
};

type QrCodeRequestOptions = {
  silent?: boolean;
};

export async function fetchQrCodesPage(
  page = 1,
  pageSize = 20,
  filters?: QrCodeListFilters,
  options?: QrCodeRequestOptions,
): Promise<{ items: QrCode[]; pagination: QrCodePagination }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (filters?.status) params.status = filters.status;
  if (typeof filters?.assigned_to_id === "number" && Number.isFinite(filters.assigned_to_id)) {
    params.assigned_to_id = filters.assigned_to_id;
  }

  const { data } = await api.get<unknown>(QR_CODE_PATHS.list, {
    params,
    skipErrorToast: options?.silent === true,
  });
  return parseQrCodeListResponse(data, page, pageSize);
}

export async function fetchAllQrCodeIds(filters?: QrCodeListFilters): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchQrCodesPage(page, pageSize, filters, { silent: true }));
}

export async function fetchQrCode(id: number, options?: QrCodeRequestOptions): Promise<QrCode> {
  const { data } = await api.get<unknown>(QR_CODE_PATHS.detail(id), {
    skipErrorToast: options?.silent === true,
  });
  return parseQrCodeEntity(data);
}

export async function generateQrCodes(body: QrCodeGeneratePayload): Promise<QrCode[]> {
  const { data } = await api.post<unknown>(QR_CODE_PATHS.generate, body);
  return parseQrCodeGenerateResponse(data);
}

export async function deleteQrCode(id: number): Promise<void> {
  const { data } = await api.delete<unknown>(QR_CODE_PATHS.detail(id));
  parseQrCodeDeleteResponse(data);
}
