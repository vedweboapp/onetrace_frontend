export const PURCHASE_RECEIVE_PATHS = {
  list: "purchasereceives/",
  detail: (id: number) => `purchasereceives/${id}/`,
  folders: (id: number) => `purchasereceives/${id}/folders/`,
  folderDetail: (prId: number, folderId: number) => `purchasereceives/${prId}/folders/${folderId}/`,
} as const;
