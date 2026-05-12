export const SITE_PATHS = {
  list: "site/",
  detail: (id: number) => `site/${id}/`,
} as const;
