export const FORM_BUILDER_API_PATHS = {
  formsList: "/settings/forms/",
  saveLayout: (module: string) => `/settings/forms/save_layout/?module=${module}`,
  getForm: (module: string) => `/settings/forms/get_form/?module=${module}`,
  formById: (id: string | number) => `/settings/forms/${id}/`,
};
