import type { ItemCreatePayload, ItemUpdatePayload } from "@/features/items/types/item.types";

/** New upload, or an existing attachment marked for deletion. */
export type ItemAttachmentWriteRef =
  | { id: number; is_deleted: true }
  | { file: File };

function appendScalar(fd: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (typeof value === "boolean") {
    fd.append(key, value ? "true" : "false");
    return;
  }
  if (typeof value === "object") {
    fd.append(key, JSON.stringify(value));
    return;
  }
  fd.append(key, String(value));
}

/**
 * Build multipart FormData for item/composite-item create & update.
 * - Scalar fields → form fields
 * - Arrays/objects (e.g. components) → JSON string fields
 * - New files → repeated `attachments` (binary)
 * - Removals → repeated `deleted_attachment_ids` (id)
 */
export function buildItemWriteBody(
  body: ItemCreatePayload | ItemUpdatePayload,
  attachmentRefs?: ItemAttachmentWriteRef[],
): FormData {
  const refs = attachmentRefs ?? [];
  const newFiles = refs.filter((r): r is { file: File } => "file" in r && r.file instanceof File);
  const deletedIds = refs
    .filter((r): r is { id: number; is_deleted: true } => "id" in r && r.is_deleted === true)
    .map((r) => r.id);

  const fd = new FormData();
  const record = body as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    // Attachments are sent via dedicated FormData keys below, not as JSON on the body.
    if (key === "attachments") continue;
    appendScalar(fd, key, value);
  }

  for (const id of deletedIds) {
    fd.append("deleted_attachment_ids", String(id));
  }
  for (const { file } of newFiles) {
    fd.append("attachments", file, file.name);
  }

  return fd;
}
