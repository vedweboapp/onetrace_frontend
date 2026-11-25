export const PURCHASE_ORDER_PATHS = {
  list: "purchase-orders/",
  detail: (id: number) => `purchase-orders/${id}/`,
  folders: (id: number) => `purchase-orders/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `purchase-orders/${entityId}/folders/${folderId}/`,
} as const;
