import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import type { QrCode, QrCodeGenerateResult, QrCodePagination } from "../types/qr-code.types";

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

function normalizeQrCodeGenerateResult(row: QrCodeGenerateResult, message?: string): QrCodeGenerateResult {
  return {
    batch: { ...row.batch },
    qr_codes: Array.isArray(row.qr_codes) ? row.qr_codes.map(normalizeQrCode) : [],
    message,
  };
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

export function parseQrCodeGenerateResponse(data: unknown): QrCodeGenerateResult {
  if (typeof data !== "object" || data === null) {
    throw new ApiBusinessError("Unexpected QR generate response");
  }
  if ("success" in data) {
    const envelope = data as ApiEnvelope<QrCodeGenerateResult | QrCode[]>;
    if (!envelope.success || envelope.data == null) {
      const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
      throw new ApiBusinessError(msg);
    }
    if (
      typeof envelope.data === "object" &&
      envelope.data !== null &&
      "batch" in envelope.data &&
      "qr_codes" in envelope.data
    ) {
      return normalizeQrCodeGenerateResult(envelope.data as QrCodeGenerateResult, envelope.message);
    }
    if (Array.isArray(envelope.data)) {
      return {
        batch: {
          id: 0,
          batch_number: "",
          quantity: envelope.data.length,
          created_at: "",
          created_by: null,
        },
        qr_codes: envelope.data.map(normalizeQrCode),
        message: envelope.message,
      };
    }
  }
  if (
    "data" in data &&
    typeof (data as { data?: unknown }).data === "object" &&
    (data as { data?: unknown }).data !== null &&
    "batch" in ((data as { data: QrCodeGenerateResult }).data) &&
    "qr_codes" in ((data as { data: QrCodeGenerateResult }).data)
  ) {
    const body = data as { data: QrCodeGenerateResult; message?: string };
    return normalizeQrCodeGenerateResult(body.data, body.message);
  }
  if ("results" in data && Array.isArray((data as QrCodeDrfListResponse).results)) {
    return {
      batch: {
        id: 0,
        batch_number: "",
        quantity: (data as QrCodeDrfListResponse).results.length,
        created_at: "",
        created_by: null,
      },
      qr_codes: (data as QrCodeDrfListResponse).results.map(normalizeQrCode),
    };
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
