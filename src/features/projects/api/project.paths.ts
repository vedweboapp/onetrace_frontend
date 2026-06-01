export const PROJECT_PATHS = {
  list: "project/",
  detail: (id: number) => `project/${id}/`,
  /** GET /project-forms/{id}/ */
  projectForms: (id: number | string) => `project-forms/${id}/`,
  /** GET /project-forms/{id}/metadata/ */
  projectFormMetadata: (id: number | string) => `project-forms/${id}/metadata/`,
  /** POST /project-forms/{id}/sections/ */
  projectFormSections: (id: number | string) => `project-forms/${id}/sections/`,
  /** POST | PUT /project-forms/{id}/rules/ */
  projectFormRules: (id: number | string) => `project-forms/${id}/rules/`,
} as const;
