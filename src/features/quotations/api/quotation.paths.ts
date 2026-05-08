export const QUOTATION_PATHS = {
  list: "quotations/",
  detail: (id: number) => `quotations/${id}/`,
  /** Project levels for quotation form; adjust path if backend differs. */
  projectLevels: (projectId: number) => `project/${projectId}/levels/`,
} as const;
