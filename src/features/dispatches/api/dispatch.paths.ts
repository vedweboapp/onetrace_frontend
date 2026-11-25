export const DISPATCH_RETURN_REQUEST_PATHS = {
  list: "return-request",
  detail: (id: number) => `return-request/${id}`,
  complete: (id: number) => `return-request/${id}/complete`,
  approve: (id: number) => `return-request/${id}/approve/`,
  reject: (id: number) => `return-request/${id}/reject/`,
  folders: (id: number) => `return-request/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `return-request/${entityId}/folders/${folderId}/`,
} as const;

export const DISPATCH_PATHS = {
  list: "dispatch",
  detail: (id: number) => `dispatch/${id}`,
  logs: (id: number) => `dispatch/${id}/logs`,
  restock: (id: number) => `dispatch/${id}/restock`,
  returnItems: (id: number) => `dispatch/${id}/return-items`,
  returnToStock: (id: number) => `dispatch/${id}/return-to-stock`,
  workerReturnMaterials: "dispatch/worker-return-materials",
  folders: (id: number) => `dispatch/${id}/folders/`,
  folderDetail: (entityId: number, folderId: number) => `dispatch/${entityId}/folders/${folderId}/`,
} as const;
