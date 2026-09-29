export const PROJECT_STATUS_PATHS = {
  list: "project-status/",
  detail: (id: number) => `project-status/${id}/`,
} as const;
