export const SITE_PATHS = {
  list: "site/",
  detail: (id: number) => `site/${id}/`,
  folders: (id: number) => `site/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `site/${entityId}/folders/${folderId}/`,
} as const;
