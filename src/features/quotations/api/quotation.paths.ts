export const QUOTATION_PATHS = {
  list: "quotations/",
  detail: (id: number) => `quotations/${id}/`,
  send: (id: number) => `quotations/${id}/send/`,
  /** Project levels (drawings) for quotation form. */
  projectLevels: (projectId: number) => `project/${projectId}/level/`,
} as const;
