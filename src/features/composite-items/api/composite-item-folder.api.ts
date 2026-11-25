import api from "@/core/api/axios";
import type { ApiEnvelope } from "@/core/types/api.types";
import type { EntityAttachmentWriteRef } from "@/shared/attachments/entity-attachment.types";
import { updateEntityAttachments } from "@/shared/attachments/update-entity-attachments.util";
import { COMPOSITE_ITEM_PATHS } from "@/features/composite-items/api/composite-item.paths";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import type { CompositeItemFolder } from "@/features/composite-items/types/composite-item-folder.types";

export async function fetchCompositeItemFolders(id: number): Promise<CompositeItemFolder[]> {
  try {
    const { data } = await api.get<ApiEnvelope<CompositeItemFolder[]> | CompositeItemFolder[]>(
      COMPOSITE_ITEM_PATHS.folders(id),
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "data" in data && Array.isArray(data.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

export async function createCompositeItemFolder(entityId: number, name: string): Promise<CompositeItemFolder> {
  const { data } = await api.post<ApiEnvelope<CompositeItemFolder> | CompositeItemFolder>(
    COMPOSITE_ITEM_PATHS.folders(entityId),
    { name },
  );
  if (data && typeof data === "object" && "data" in data && data.data) return data.data;
  return data as CompositeItemFolder;
}

export async function updateCompositeItemFolder(
  entityId: number,
  folderId: number,
  name: string,
): Promise<CompositeItemFolder> {
  const { data } = await api.patch<ApiEnvelope<CompositeItemFolder> | CompositeItemFolder>(
    COMPOSITE_ITEM_PATHS.folderDetail(entityId, folderId),
    { name },
  );
  if (data && typeof data === "object" && "data" in data && data.data) return data.data;
  return data as CompositeItemFolder;
}

export async function deleteCompositeItemFolder(entityId: number, folderId: number): Promise<void> {
  await api.delete(COMPOSITE_ITEM_PATHS.folderDetail(entityId, folderId));
}

export async function updateCompositeItemAttachments(
  id: number,
  refs: EntityAttachmentWriteRef[],
  options?: { folderId?: number | null },
): Promise<CompositeItem> {
  return updateEntityAttachments<CompositeItem>(COMPOSITE_ITEM_PATHS.attachmentDetail(id), refs, options);
}
