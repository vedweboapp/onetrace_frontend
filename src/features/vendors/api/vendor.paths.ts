export const VENDOR_PATHS = {
  list: "vendors/",
  detail: (id: number) => `vendors/${id}/`,
} as const;
