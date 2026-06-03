export const PROJECT_PATHS = {
  list: "project/",
  detail: (id: number) => `project/${id}/`,
  /** GET /{projectId}/project-forms/ */
  projectFormsList: (projectId: number | string) => `project-forms/?project_id=${projectId}`,
  /** GET /project-forms/{id}/ */
  projectForms: (id: number | string) => `project-forms/${id}/metadata/`,
  /** GET /project-forms/{id}/metadata/ */
  projectFormMetadata: (id: number | string) => `project-forms/${id}/metadata/`,
  /** PUT /project-forms/{id}/update/ */
  projectFormUpdate: (id: number | string) => `project-forms/${id}/update/`,
  /** POST /project-forms/{id}/sections/ */
  projectFormSections: (id: number | string) => `project-forms/${id}/sections/`,
  /** POST | PUT /project-forms/{id}/rules/ */
  projectFormRules: (id: number | string) => `project-forms/${id}/rules/`,
} as const;
