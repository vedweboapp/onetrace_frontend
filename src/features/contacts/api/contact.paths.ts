export const CONTACT_PATHS = {
  list: "contact/",
  detail: (id: number) => `contact/${id}/`,
  folders: (id: number) => `contact/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `contact/${entityId}/folders/${folderId}/`,
} as const;
