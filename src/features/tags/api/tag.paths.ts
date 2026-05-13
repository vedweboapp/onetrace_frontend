export const TAG_PATHS = {
  list: "tag/",
  detail: (id: number) => `tag/${id}/`,
} as const;
