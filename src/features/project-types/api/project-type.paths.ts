export const PROJECT_TYPE_PATHS = {
  list: "project-type/",
  detail: (id: number) => `project-type/${id}/`,
} as const;
