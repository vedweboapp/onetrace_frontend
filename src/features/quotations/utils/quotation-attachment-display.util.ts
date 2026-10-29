import type { QuotationAttachment } from "@/features/quotations/types/quotation.types";

/** Resolve download/open URL from API attachment row. */
export function resolveQuotationAttachmentUrl(
  row: Pick<QuotationAttachment, "file" | "file_url" | "attachment" | "url">,
): string | null {
  const raw = row.file ?? row.file_url ?? row.attachment ?? row.url;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed || null;
}

/** Resolve display label from API attachment row. */
export function resolveQuotationAttachmentLabel(
  row: Pick<QuotationAttachment, "id" | "file_name" | "file" | "file_url" | "attachment" | "url">,
): string {
  if (row.file_name?.trim()) return row.file_name.trim();
  const url = resolveQuotationAttachmentUrl(row);
  if (url) {
    try {
      const path = url.includes("://") ? new URL(url).pathname : url;
      const last = path.split("/").filter(Boolean).pop();
      if (last?.trim()) return decodeURIComponent(last);
    } catch {
      const parts = url.split("/");
      const last = parts[parts.length - 1];
      if (last?.trim()) return decodeURIComponent(last);
    }
  }
  return row.id != null ? `Attachment #${row.id}` : "Attachment";
}

export function hasQuotationAttachment(row: QuotationAttachment | null | undefined): boolean {
  if (!row) return false;
  return (
    row.id != null ||
    Boolean(row.file_name?.trim()) ||
    Boolean(resolveQuotationAttachmentUrl(row))
  );
}
