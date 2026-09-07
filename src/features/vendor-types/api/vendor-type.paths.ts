export const VENDOR_TYPE_PATHS = {
  list: "vendor-type/",
  detail: (id: number) => `vendor-type/${id}/`,
} as const;
