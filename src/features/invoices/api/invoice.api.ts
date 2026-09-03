import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import { fetchAllEntityIds } from "@/shared/mass-actions";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { INVOICE_PATHS } from "./invoice.paths";
import type {
  InvoiceCreatePayload,
  InvoiceDetail,
  InvoiceListItem,
  InvoiceListResponse,
  InvoiceUpdatePayload,
} from "../types/invoice.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type InvoiceListFilters = {
  search?: string;
  status?: string;
  client?: number;
  issue_date?: string;
  due_date?: string;
};

export async function fetchInvoicesPage(
  page = 1,
  pageSize = 20,
  filters?: InvoiceListFilters,
): Promise<{ items: InvoiceListItem[]; pagination: InvoiceListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (filters?.status?.trim()) params.status = filters.status.trim();
  if (typeof filters?.client === "number" && filters.client > 0) params.client = filters.client;
  if (filters?.issue_date?.trim()) params.issue_date = filters.issue_date.trim();
  if (filters?.due_date?.trim()) params.due_date = filters.due_date.trim();

  const { data } = await api.get<InvoiceListResponse>(INVOICE_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchAllInvoiceIds(filters?: InvoiceListFilters): Promise<number[]> {
  return fetchAllEntityIds((page, pageSize) => fetchInvoicesPage(page, pageSize, filters));
}

export async function fetchInvoice(id: number, options?: { silent?: boolean }): Promise<InvoiceDetail> {
  const { data } = await api.get<ApiEnvelope<InvoiceDetail>>(INVOICE_PATHS.detail(id), {
    skipErrorToast: options?.silent === true,
  });
  assertApiSuccess(data);
  return data.data;
}

export async function createInvoice(body: InvoiceCreatePayload): Promise<InvoiceDetail> {
  const { data } = await api.post<ApiEnvelope<InvoiceDetail>>(INVOICE_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updateInvoice(id: number, body: InvoiceUpdatePayload): Promise<InvoiceDetail> {
  const { data } = await api.patch<ApiEnvelope<InvoiceDetail>>(INVOICE_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteInvoice(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(INVOICE_PATHS.detail(id));
  assertApiSuccess(data);
}

export async function sendInvoice(id: number): Promise<void> {
  const { data } = await api.post<ApiEnvelope<unknown>>(INVOICE_PATHS.send(id), {});
  assertApiSuccess(data);
}

function parseFilenameFromContentDisposition(header: string | undefined): string | null {
  if (!header || typeof header !== "string") return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      return encoded[1].trim();
    }
  }
  const basic = /filename="([^"]+)"/i.exec(header);
  if (basic?.[1]) return basic[1].trim();
  const loose = /filename=([^;\s]+)/i.exec(header);
  if (loose?.[1]) return loose[1].replace(/^["']|["']$/g, "").trim();
  return null;
}

export async function exportInvoicePdf(id: number, invoiceNumber?: string): Promise<void> {
  const res = await api.get<Blob>(INVOICE_PATHS.detail(id), {
    params: { type: "pdf" },
    responseType: "blob",
    skipErrorToast: true,
    headers: { Accept: "*/*" },
  });

  const blob = res.data;
  const header = typeof res.headers?.["content-disposition"] === "string" ? res.headers["content-disposition"] : undefined;
  const parsed = parseFilenameFromContentDisposition(header);
  const safe =
    (invoiceNumber?.trim() ?? "")
      .replace(/[/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || `invoice-${id}`;
  const filename = parsed ?? `${safe}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function previewInvoicePdf(id: number): Promise<void> {
  const res = await api.get<Blob>(INVOICE_PATHS.detail(id), {
    params: { type: "pdf" },
    responseType: "blob",
    skipErrorToast: true,
    headers: { Accept: "*/*" },
  });
  const url = URL.createObjectURL(res.data);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
