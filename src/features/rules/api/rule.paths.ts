export const RULE_PATHS = {
  list: "form-render-rules/?all=true",
  byProjectForm: (projectFormId: number | string) =>
    `form-render-rules/?project_form=${projectFormId}`,
  create: "form-render-rules/",
  projectForms: "forms/",
  projectFormMetadata: (projectFormId: number | string) =>
    `forms/${projectFormId}/metadata/`,
} as const;
