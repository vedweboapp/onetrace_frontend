export const COMPOSITE_ITEM_PATHS = {
  list: "composite-item/",
  detail: (id: number) => `composite-item/${id}/`,
  folders: (id: number) => `composite-item/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `composite-item/${entityId}/folders/${folderId}/`,
} as const;
