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
  const method = purpose === "create_project_form" ? "post" : "put";
  const { data } = await api[method](
    `forms/${formId}/rules/`,
    rulesPayload,
    { skipErrorToast: true },
  );
  assertApiSuccess(data);
  return data.data;
}
/** POST /api/v1/forms/{formId}/sections/ */
export async function createProjectFormSections(
  formId: string | number,
  sectionsPayload: any,
): Promise<any> {
  const payload = Array.isArray(sectionsPayload)
    ? { sections: sectionsPayload }
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
