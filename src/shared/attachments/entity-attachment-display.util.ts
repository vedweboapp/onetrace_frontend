import type { EntityAttachment } from "./entity-attachment.types";

/** Resolve download/open URL from API attachment row. */
export function resolveEntityAttachmentUrl(
  row: Pick<EntityAttachment, "file" | "file_url" | "attachment" | "url">,
): string | null {
  const raw = row.file ?? row.file_url ?? row.attachment ?? row.url;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

/** Resolve display label from API attachment row. */
export function resolveEntityAttachmentLabel(
  row: Pick<EntityAttachment, "id" | "file_name" | "file" | "file_url" | "attachment" | "url">,
): string {
  const named = row.file_name?.trim();
  if (named) return named;
  const url = resolveEntityAttachmentUrl(row);
  if (url) {
    try {
      const path = url.split("?")[0] ?? url;
      const segment = path.split("/").filter(Boolean).pop();
      if (segment) return decodeURIComponent(segment);
    } catch {
      /* ignore */
    }
  }
  return row.id != null ? `Attachment #${row.id}` : "Attachment";
}

export function hasEntityAttachment(row: EntityAttachment | null | undefined): boolean {
  if (!row) return false;
  return (
    row.id != null
    || Boolean(row.file_name?.trim())
    || Boolean(resolveEntityAttachmentUrl(row))
  );
}
