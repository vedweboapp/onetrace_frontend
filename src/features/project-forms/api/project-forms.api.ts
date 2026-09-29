import api from "@/core/api/axios";
import { assertApiSuccess } from "@/core/types/api.types";
import { PROJECT_FROM_PATH } from "./project-api.path";

/** POST /api/v1/forms/ */
export async function createProjectForm(payload: any): Promise<any> {
  const { data } = await api.post("forms/", payload, {
    skipErrorToast: true,
  });
  // This API returns the form object directly (not wrapped in { success, data } envelope)
  return data;
}

/** PUT /api/v1/forms/{formId}/ */
export async function updateProjectForm(
  formId: string | number,
  payload: any,
): Promise<any> {
  const { data } = await api.put(`forms/${formId}/`, payload, {
    skipErrorToast: true,
  });
  return data?.data ?? data;
}

/** POST/PUT /api/v1/forms/{formId}/rules/ */
export async function createProjectFormRules(
  formId: string | number,
  rulesPayload: any[],
  purpose?: string | null,
): Promise<any> {
  // Return early if no rules
  if (!rulesPayload || rulesPayload.length === 0) {
    return null;
  }

  // Separate rules into new (without id) and edited (with id)
  const newRules = rulesPayload.filter((rule) => !rule.id && rule.id !== 0);
  const editedRules = rulesPayload.filter((rule) => rule.id || rule.id === 0);

  const results: any[] = [];

  // POST for new rules when creating or if there are new rules in edit mode
  if (newRules.length > 0) {
    try {
      const { data } = await api.post(
        `forms/${formId}/rules/`,
        newRules,
        { skipErrorToast: true },
      );
      assertApiSuccess(data);
      results.push(data.data);
    } catch (error) {
      console.error("Failed to POST new rules:", error);
      throw error;
    }
  }

  // PUT for edited rules
  if (editedRules.length > 0) {
    try {
      const { data } = await api.put(
        `forms/${formId}/rules/`,
        editedRules,
        { skipErrorToast: true },
      );
      assertApiSuccess(data);
      results.push(data.data);
    } catch (error) {
      console.error("Failed to PUT edited rules:", error);
      throw error;
    }
  }

  // Return merged result or single result
  return results.length > 1 ? results : results[0] || null;
}
/** POST /api/v1/forms/{formId}/sections/ */
export async function createProjectFormSections(
  formId: string | number,
  sectionsPayload: any,
): Promise<any> {
  const payload = Array.isArray(sectionsPayload)
    ? { create: sectionsPayload }
    : sectionsPayload;
  const { data } = await api.post(
    `forms/${formId}/sections/`,
    payload,
    { skipErrorToast: true },
  );
  assertApiSuccess(data);
  return data.data;
}
export async function getProjectFormList(params?: any): Promise<any> {
  const { data } = await api.get(PROJECT_FROM_PATH.fetchProjectsFormList, {
    params,
  });
  return data;
}

export async function getProjectForm(id: string | number): Promise<any> {
  const { data } = await api.get(PROJECT_FROM_PATH.fetchProjectForm(String(id)));
  return data;
}
