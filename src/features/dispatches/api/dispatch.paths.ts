export const DISPATCH_RETURN_REQUEST_PATHS = {
  list: "dispatch-return-requests",
  complete: (id: number) => `dispatch-return-requests/${id}/complete`,
} as const;

export const DISPATCH_PATHS = {
  list: "dispatches",
  detail: (id: number) => `dispatches/${id}`,
  logs: (id: number) => `dispatches/${id}/logs`,
  restock: (id: number) => `dispatches/${id}/restock`,
  returnItems: (id: number) => `dispatches/${id}/return-items`,
  returnToStock: (id: number) => `dispatches/${id}/return-to-stock`,
  workerReturnMaterials: "dispatches/worker-return-materials",
} as const;
