import api from "@/core/api/axios";
import { assertApiSuccess, type ApiEnvelope } from "@/core/types/api.types";

/**
 * Move a single entity attachment to a target folder (or root if folderId is null).
 * Sends PATCH with only the moved attachment: `{ attachments: [{ id, folder_id }] }`
 */
export async function moveEntityAttachment<T>(
  detailPath: string,
  attachmentId: number,
  targetFolderId: number | null,
): Promise<T> {
  const { data } = await api.patch<ApiEnvelope<T> | T>(detailPath, {
    attachments: [{ id: attachmentId, folder_id: targetFolderId }],
  });

  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<T>);
    return (data as ApiEnvelope<T>).data;
  }
  return data as T;
}
