import api from "@/core/api/axios";
import { assertApiSuccess } from "@/core/types/api.types";
import { PROJECT_PATHS } from "./project.paths";

/**
 * Raw API calls for /project-forms/{id}/ sub-resources.
 *
 * Used exclusively by projectJobFormHandlers for the
 * create_project_job_form / edit_project_job_form purposes.
 */

/** GET /project-forms/{id}/ — fetch full form schema (sections + rules). */
export async function getProjectJobForm(id: string | number): Promise<any> {
  const { data } = await api.get(PROJECT_PATHS.projectForms(id));
  return data;
}

/**
 * POST /project-forms/{id}/sections/
 *
 * Accepts either a plain array (create flow) or a differential object
 * { create, update, delete } (edit flow) — mirrors createProjectFormSections.
 */
export async function createProjectJobFormSections(
  formId: string | number,
  sectionsPayload: any,
): Promise<any> {
  const payload = Array.isArray(sectionsPayload)
    ? { create: sectionsPayload }
    : sectionsPayload;
  const { data } = await api.post(
    PROJECT_PATHS.projectFormSections(formId),
    payload,
    { skipErrorToast: true },
  );
  assertApiSuccess(data);
  return data.data;
}

/**
 * POST / PUT /project-forms/{id}/rules/
 *
 * Rules without an `id` are POSTed (new), rules with an `id` are PUT (edit).
 * Mirrors the logic in createProjectFormRules.
 */
export async function createProjectJobFormRules(
  formId: string | number,
  rulesPayload: any[],
  purpose?: string | null,
): Promise<any> {
  if (!rulesPayload || rulesPayload.length === 0) {
    return null;
  }

  const newRules = rulesPayload.filter((rule) => !rule.id && rule.id !== 0);
  const editedRules = rulesPayload.filter((rule) => rule.id || rule.id === 0);

  const results: any[] = [];

  if (newRules.length > 0) {
    try {
      const { data } = await api.post(
        PROJECT_PATHS.projectFormRules(formId),
        newRules,
        { skipErrorToast: true },
      );
      assertApiSuccess(data);
      results.push(data.data);
    } catch (error) {
      console.error("Failed to POST new project job form rules:", error);
      throw error;
    }
  }

  if (editedRules.length > 0) {
    try {
      const { data } = await api.put(
        PROJECT_PATHS.projectFormRules(formId),
        editedRules,
        { skipErrorToast: true },
      );
      assertApiSuccess(data);
      results.push(data.data);
    } catch (error) {
      console.error("Failed to PUT edited project job form rules:", error);
      throw error;
    }
  }

  return results.length > 1 ? results : results[0] || null;
}
