import api from "@/core/api/axios";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import { QR_CODE_PATHS } from "./qr-code.paths";
import type {
  QrCode,
  QrCodeGeneratePayload,
  QrCodeGenerateResult,
  QrCodePagination,
} from "../types/qr-code.types";
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

function parseFilenameFromContentDisposition(header: string | undefined): string | null {
  if (!header) return null;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1]).trim();
    } catch {
      return utf[1].trim();
    }
  }
  const basic = /filename="([^"]+)"/i.exec(header);
  if (basic?.[1]) return basic[1].trim();
  const loose = /filename=([^;\s]+)/i.exec(header);
  if (loose?.[1]) return loose[1].replace(/^["']|["']$/g, "").trim();
  return null;
}

export async function generateQrCodes(body: QrCodeGeneratePayload): Promise<QrCodeGenerateResult> {
  const { data } = await api.post<unknown>(QR_CODE_PATHS.generate, body);
  return parseQrCodeGenerateResponse(data);
}

export async function downloadQrCodesCsv(batchId: number, batchNumber?: string | null): Promise<void> {
  const res = await api.get<Blob>(QR_CODE_PATHS.list, {
    params: { download_type: "csv", batch_id: batchId },
    responseType: "blob",
    skipErrorToast: true,
    headers: { Accept: "text/csv,*/*" },
  });

  const header = typeof res.headers?.["content-disposition"] === "string" ? res.headers["content-disposition"] : undefined;
  const parsed = parseFilenameFromContentDisposition(header);
  const safeBatch =
    (batchNumber?.trim() ?? "")
      .replace(/[/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || `qr-batch-${batchId}`;
  const filename = parsed ?? `${safeBatch}.csv`;

  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function deleteQrCode(id: number): Promise<void> {
  const { data } = await api.delete<unknown>(QR_CODE_PATHS.detail(id));
  parseQrCodeDeleteResponse(data);
}
