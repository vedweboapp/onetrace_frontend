export const SITE_PATHS = {
  list: "sites/",
  detail: (id: number) => `sites/${id}/`,
} as const;
