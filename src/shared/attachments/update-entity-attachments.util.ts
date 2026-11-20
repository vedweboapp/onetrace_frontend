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
  options?: { folderId?: number | null },
): Promise<T> {
  const fd = new FormData();
  let folderAppended = false;
  for (const ref of refs) {
    if ("file" in ref && ref.file instanceof File) {
      fd.append("attachments", ref.file, ref.file.name);
      const targetFolder = ref.folder !== undefined ? ref.folder : options?.folderId;
      if (targetFolder != null && !folderAppended) {
        fd.append("folder_id", String(targetFolder));
        fd.append("folder", String(targetFolder));
        folderAppended = true;
      }
    } else if ("id" in ref && ref.is_deleted === true) {
      fd.append("deleted_attachment_ids", String(ref.id));
    }
  }
  const { data } = await api.patch<ApiEnvelope<T> | T>(detailPath, fd);
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<T>);
    return (data as ApiEnvelope<T>).data;
  }
  return data as T;
}
