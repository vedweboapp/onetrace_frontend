import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import type { QrCode, QrCodePagination } from "../types/qr-code.types";

/** Django REST framework paginated list (`count`, `results`, `next`, `previous`). */
export type QrCodeDrfListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: QrCode[];
};

export type QrCodeEnvelopeListResponse = {
  success: boolean;
  message?: string;
  data: QrCode[];
  pagination: QrCodePagination;
};

export function normalizeQrCode(row: QrCode): QrCode {
  return { ...row };
}

function isDrfListResponse(data: unknown): data is QrCodeDrfListResponse {
  if (typeof data !== "object" || data === null) return false;
  const o = data as QrCodeDrfListResponse;
  return typeof o.count === "number" && Array.isArray(o.results);
}

function isEnvelopeListResponse(data: unknown): data is QrCodeEnvelopeListResponse {
  if (typeof data !== "object" || data === null) return false;
  const o = data as QrCodeEnvelopeListResponse;
  return o.success === true && Array.isArray(o.data) && typeof o.pagination === "object";
}

export function drfListToPagination(
  count: number,
  page: number,
  pageSize: number,
  next: string | null,
  previous: string | null,
): QrCodePagination {
  const total_pages = count <= 0 ? 1 : Math.max(1, Math.ceil(count / pageSize));
  return {
    total_records: count,
    total_pages,
    current_page: page,
    page_size: pageSize,
    next,
    previous,
  };
}

export function parseQrCodeListResponse(
  data: unknown,
  page: number,
  pageSize: number,
): { items: QrCode[]; pagination: QrCodePagination } {
  if (isDrfListResponse(data)) {
    return {
      items: data.results.map(normalizeQrCode),
      pagination: drfListToPagination(data.count, page, pageSize, data.next, data.previous),
    };
  }
  if (isEnvelopeListResponse(data)) {
    return {
      items: data.data.map(normalizeQrCode),
      pagination: data.pagination,
    };
  }
  throw new ApiBusinessError("Unexpected QR codes list response");
}

export function parseQrCodeEntity(data: unknown): QrCode {
  if (typeof data !== "object" || data === null) {
    throw new ApiBusinessError("Unexpected QR code response");
  }
  if ("success" in data) {
    const envelope = data as ApiEnvelope<QrCode>;
    if (!envelope.success || envelope.data == null) {
      const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
      throw new ApiBusinessError(msg);
    }
    return normalizeQrCode(envelope.data);
  }
  if ("id" in data && "qr_code_id" in data) {
    return normalizeQrCode(data as QrCode);
  }
  throw new ApiBusinessError("Unexpected QR code response");
}

export function parseQrCodeGenerateResponse(data: unknown): QrCode[] {
  if (Array.isArray(data)) {
    return data.map((row) => normalizeQrCode(row as QrCode));
  }
  if (typeof data !== "object" || data === null) {
    throw new ApiBusinessError("Unexpected QR generate response");
  }
  if ("success" in data) {
    const envelope = data as ApiEnvelope<QrCode[]>;
    if (!envelope.success || !Array.isArray(envelope.data)) {
      const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
      throw new ApiBusinessError(msg);
    }
    return envelope.data.map(normalizeQrCode);
  }
  if ("data" in data && Array.isArray((data as { data: QrCode[] }).data)) {
    return (data as { data: QrCode[] }).data.map(normalizeQrCode);
  }
  if ("results" in data && Array.isArray((data as QrCodeDrfListResponse).results)) {
    return (data as QrCodeDrfListResponse).results.map(normalizeQrCode);
  }
  throw new ApiBusinessError("Unexpected QR generate response");
}

export function parseQrCodeDeleteResponse(data: unknown): void {
  if (data == null || data === "") return;
  if (typeof data === "object" && "success" in data) {
    const envelope = data as { success: boolean; message?: string };
    if (!envelope.success) {
      const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
      throw new ApiBusinessError(msg);
    }
  }
}
