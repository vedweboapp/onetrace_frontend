import api from "@/core/api/axios";
import { assertApiSuccess, type ApiEnvelope } from "@/core/types/api.types";
import type { EntityAttachmentWriteRef } from "./entity-attachment.types";

/**
 * Patch entity attachments via multipart FormData (same contract as quotations).
 * - New files → repeated `attachments`
 * - Removals → repeated `deleted_attachment_ids`
 */
export async function updateEntityAttachments<T>(
  detailPath: string,
  refs: EntityAttachmentWriteRef[],
): Promise<T> {
  const fd = new FormData();
  for (const ref of refs) {
    if ("file" in ref && ref.file instanceof File) {
      fd.append("attachments", ref.file, ref.file.name);
    } else if ("id" in ref && ref.is_deleted === true) {
      fd.append("deleted_attachment_ids", String(ref.id));
    }
  }
  const { data } = await api.patch<ApiEnvelope<T>>(detailPath, fd);
  assertApiSuccess(data);
  return data.data;
}
