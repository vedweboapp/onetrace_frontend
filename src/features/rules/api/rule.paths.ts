export const RULE_PATHS = {
  list: "form-render-rules/?all=true",
  byProjectForm: (
    projectFormId: number | string,
    params?: { page?: number; page_size?: number },
  ) => {
    const sp = new URLSearchParams();
    sp.set("project_form", String(projectFormId));
    if (params?.page) sp.set("page", String(params.page));
    if (params?.page_size) sp.set("page_size", String(params.page_size));
    return `form-render-rules/?${sp.toString()}`;
  },
  create: "form-render-rules/",
  update: (ruleId: number | string) => `form-render-rules/${ruleId}/`,
  delete: (ruleId: number | string) => `form-render-rules/${ruleId}/`,
  projectForms: "forms/",
  projectFormMetadata: (projectFormId: number | string) =>
    `forms/${projectFormId}/metadata/`,
} as const;
