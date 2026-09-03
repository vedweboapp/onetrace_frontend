import type {
  FormBuilderApiHandlers,
  HandlerContext,
} from "@/shared/form/formbuilder/form-builder.handlers";
import {
  createProjectForm,
  createProjectFormRules,
  createProjectFormSections,
  getProjectForm,
  updateProjectForm,
} from "./project-forms.api";

/**
 * Concrete FormBuilder API handlers for the "create_project_form" flow.
 *
 * Inject these into <FormBuilder apiHandlers={projectFormHandlers} /> when
 * rendering the builder inside the Project Forms feature.
 */
export const projectFormHandlers: FormBuilderApiHandlers = {
  /** Fetch an existing project form by id. */
  fetchForm: async (id: string | number): Promise<any> => {
    return getProjectForm(id);
  },

  /**
   * Step 1 — POST /api/v1/forms/
   * Strips builder-internal keys (sections, rules) so only flat metadata is
   * sent. Also injects `project_type` from the handler context.
   */
  createForm: async (payload: any, ctx: HandlerContext): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sections, rules, ...formMeta } = payload;
    const enrichedPayload = {
      ...formMeta,
      ...(ctx.projectTypeId ? { project_type: ctx.projectTypeId } : {}),
      ...(ctx.installationTypeId ? { installation_type: ctx.installationTypeId } : {}),
    };
    return createProjectForm(enrichedPayload);
  },

  /**
   * Step 1 for edit project form — PUT /api/v1/forms/{formId}/
   * Keeps section and rule updates on their dedicated endpoints.
   */
  updateForm: async (
    id: string | number,
    payload: any,
    _ctx: HandlerContext,
  ): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sections, rules, ...formMeta } = payload;
    return updateProjectForm(id, formMeta);
  },

  /**
   * Step 2 — POST /api/v1/forms/{formId}/sections/
   * Called automatically by FormBuilder after a successful `createForm`.
   */
  createSections: async (
    formId: string | number,
    sections: any,
    _ctx: HandlerContext,
  ): Promise<any> => {
    return createProjectFormSections(formId, sections);
  },

  /**
   * Step 3 — POST /api/v1/forms/{formId}/rules/ for create, PUT for edit
   * Called automatically by FormBuilder after a successful `createForm`.
   */
  createRules: async (
    formId: string | number,
    rules: any[],
    ctx: HandlerContext,
  ): Promise<any> => {
    return createProjectFormRules(formId, rules, ctx.purpose);
  },
};
