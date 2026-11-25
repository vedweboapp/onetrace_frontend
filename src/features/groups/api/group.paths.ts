export const GROUP_PATHS = {
  list: "group/",
  detail: (id: number) => `group/${id}/`,
  folders: (id: number) => `group/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `group/${entityId}/folders/${folderId}/`,
} as const;
