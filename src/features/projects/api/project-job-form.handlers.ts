import type {
  FormBuilderApiHandlers,
  HandlerContext,
} from "@/shared/form/formbuilder/form-builder.handlers";
import { createProjectForm } from "@/features/project-forms/api/project-forms.api";
import {
  getProjectJobForm,
  updateProjectJobForm,
  createProjectJobFormSections,
  createProjectJobFormRules,
} from "./project-job-form.api";

/**
 * Concrete FormBuilder API handlers for the project job form flow.
 *
 * Supports both purposes:
 *   - create_project_job_form  (mapped internally to "create_project_form")
 *   - edit_project_job_form    (mapped internally to "edit__project_form")
 *
 * Form create reuses the generic `forms/` endpoint.
 * Form update uses /project-forms/{id}/update/.
 * Sections and rules are routed through /project-forms/{id}/sections|rules/.
 *
 * Inject via:
 *   <FormBuilderForm apiHandlers={projectJobFormHandlers} />
 */
export const projectJobFormHandlers: FormBuilderApiHandlers = {
  /**
   * GET /project-forms/{id}/
   * Returns the full form schema (sections + rules) needed by the builder
   * when opening an existing form for editing.
   */
  fetchForm: async (id: string | number): Promise<any> => {
    return getProjectJobForm(id);
  },

  /**
   * Step 1 (create) — POST /api/v1/forms/
   * Strips builder-internal keys and injects the project ID from context.
   * ctx.projectTypeId carries the project ID (from the [id] route segment).
   */
  createForm: async (payload: any, ctx: HandlerContext): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sections, rules, ...formMeta } = payload;
    const enrichedPayload = {
      ...formMeta,
      ...(ctx.projectTypeId ? { project: Number(ctx.projectTypeId) } : {}),
    };
    return createProjectForm(enrichedPayload);
  },

  /**
   * Step 1 (edit) — PUT /project-forms/{formId}/update/
   * Strips sections/rules — those are handled by createSections/createRules.
   */
  updateForm: async (
    id: string | number,
    payload: any,
    _ctx: HandlerContext,
  ): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sections, rules, ...formMeta } = payload;
    return updateProjectJobForm(id, formMeta);
  },

  /**
   * Step 2 — POST /project-forms/{formId}/sections/
   * Accepts a flat array (create) or differential { create, update, delete }
   * object (edit) — the API function normalises both forms.
   */
  createSections: async (
    formId: string | number,
    sections: any,
    ctx: HandlerContext,
  ): Promise<any> => {
    return createProjectJobFormSections(formId, sections, ctx.rawPurpose);
  },

  /**
   * Step 3 — POST (new rules) / PUT (edited rules) on
   * /project-forms/{formId}/rules/
   */
  createRules: async (
    formId: string | number,
    rules: any[],
    ctx: HandlerContext,
  ): Promise<any> => {
    return createProjectJobFormRules(formId, rules, ctx.purpose);
  },
};
