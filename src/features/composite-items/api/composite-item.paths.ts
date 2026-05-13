export const COMPOSITE_ITEM_PATHS = {
  list: "composite-item/",
  detail: (id: number) => `composite-item/${id}/`,
} as const;
