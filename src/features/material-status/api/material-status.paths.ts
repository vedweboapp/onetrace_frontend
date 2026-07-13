export const MATERIAL_STATUS_PATHS = {
  list: "material-status/",
  detail: (id: number) => `material-status/${id}/`,
} as const;
