export const DISPATCH_PATHS = {
  list: "dispatches/",
  detail: (id: number) => `dispatches/${id}/`,
  logs: (id: number) => `dispatches/${id}/logs/`,
  restock: (id: number) => `dispatches/${id}/restock/`,
} as const;
