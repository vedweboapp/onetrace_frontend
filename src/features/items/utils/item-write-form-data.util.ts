import type { ItemCreatePayload, ItemUpdatePayload } from "@/features/items/types/item.types";

export type ItemAttachmentWriteRef =
  | { id: number; is_deleted?: boolean }
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

/** Build multipart body when item writes include file attachments. */
export function buildItemWriteBody(
  body: ItemCreatePayload | ItemUpdatePayload,
  attachmentRefs?: ItemAttachmentWriteRef[],
): FormData | (ItemCreatePayload | ItemUpdatePayload) {
  const refs = attachmentRefs ?? [];
  const newFiles = refs.filter((r): r is { file: File } => "file" in r && r.file instanceof File);
  const metaRefs = refs.filter((r): r is { id: number; is_deleted?: boolean } => "id" in r);

  const bodyWithDeletes =
    metaRefs.length > 0
      ? {
          ...body,
          attachments: metaRefs.map((r) => ({ id: r.id, is_deleted: r.is_deleted ?? true })),
        }
      : body;

  if (newFiles.length === 0) {
    return bodyWithDeletes;
  }

  const fd = new FormData();
  const record = bodyWithDeletes as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    appendScalar(fd, key, value);
  }

  newFiles.forEach(({ file }, index) => {
    fd.append(`attachment${index + 1}`, file, file.name);
  });

  return fd;
}
