export const ITEM_PATHS = {
  list: "item/",
  detail: (id: number) => `item/${id}/`,
  folders: (id: number) => `item/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `item/${entityId}/folders/${folderId}/`,
} as const;

