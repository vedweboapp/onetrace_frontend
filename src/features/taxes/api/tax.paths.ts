export const TAX_PATHS = {
  list: "taxes/",
  detail: (id: number | string) => `taxes/${id}/`,
} as const;

