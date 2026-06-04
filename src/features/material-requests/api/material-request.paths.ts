export const MATERIAL_REQUEST_PATHS = {
  list: "material-requests/",
  detail: (id: number) => `material-requests/${id}/`,
} as const;
