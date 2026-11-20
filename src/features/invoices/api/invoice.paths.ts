export const INVOICE_PATHS = {
  list: "invoice/",
  detail: (id: number) => `invoice/${id}/`,
  send: (id: number) => `invoice/${id}/send/`,
  folders: (id: number) => `invoice/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `invoice/${entityId}/folders/${folderId}/`,
} as const;
