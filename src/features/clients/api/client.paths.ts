export const CLIENT_PATHS = {
  list: "clients/",
  detail: (id: number) => `clients/${id}/`,
  folders: (id: number) => `clients/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `clients/${entityId}/folders/${folderId}/`,
} as const;
