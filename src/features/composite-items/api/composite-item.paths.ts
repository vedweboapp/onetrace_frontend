export const COMPOSITE_ITEM_PATHS = {
  list: "composite-item/",
  detail: (id: number) => `composite-item/${id}/`,
  attachmentDetail: (id: number) => `item/${id}/`,
  folders: (id: number) => `item/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `item/${entityId}/folders/${folderId}/`,
} as const;
