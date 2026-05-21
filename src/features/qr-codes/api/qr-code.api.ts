import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { QR_CODE_PATHS } from "./qr-code.paths";
import type {
  QrCode,
  QrCodeGeneratePayload,
  QrCodeGenerateResponse,
  QrCodeListResponse,
  QrCodeStatus,
} from "../types/qr-code.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

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
): Promise<{ items: QrCode[]; pagination: QrCodeListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (filters?.status) params.status = filters.status;
  if (typeof filters?.assigned_to_id === "number" && Number.isFinite(filters.assigned_to_id)) {
    params.assigned_to_id = filters.assigned_to_id;
  }

  const { data } = await api.get<QrCodeListResponse>(QR_CODE_PATHS.list, {
    params,
    skipErrorToast: options?.silent === true,
  });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchQrCode(id: number, options?: QrCodeRequestOptions): Promise<QrCode> {
  const { data } = await api.get<ApiEnvelope<QrCode>>(QR_CODE_PATHS.detail(id), {
    skipErrorToast: options?.silent === true,
  });
  assertApiSuccess(data);
  return data.data;
}

export async function generateQrCodes(
  body: QrCodeGeneratePayload,
): Promise<QrCode[]> {
  const { data } = await api.post<QrCodeGenerateResponse>(QR_CODE_PATHS.generate, body);
  assertEnvelopeSuccess(data);
  return data.data;
}

export async function deleteQrCode(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(QR_CODE_PATHS.detail(id));
  assertApiSuccess(data);
}
