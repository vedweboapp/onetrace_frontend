export const MATERIAL_REQUEST_PATHS = {
  list: "material-requests/",
  detail: (id: number) => `material-requests/${id}/`,
  dispatch: (id: number) => `material-requests/${id}/dispatch/`,
  logs: (id: number) => `material-requests/${id}/logs/`,
  restock: (id: number) => `material-requests/${id}/restock/`,
} as const;
