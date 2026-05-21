import api from "@/core/api/axios";
import { FORM_BUILDER_API_PATHS } from "./form-builder.paths";
import { assertApiSuccess } from "@/core/types/api.types";

export async function getFormsList(params?: any): Promise<any[]> {
  const { data } = await api.get(FORM_BUILDER_API_PATHS.formsList, { params });
  // Some endpoints might return the array directly or wrapped
  return data;
}

export async function createFormLayout(module: string, payload: any, purpose?: string | null): Promise<any> {
  const url = purpose === "create_layout"
    ? `/modules/${module}/layouts/`
    : FORM_BUILDER_API_PATHS.saveLayout(module);
  const { data } = await api.post(url, payload);
  assertApiSuccess(data);
  return data.data;
}

export async function createModuleLayout(payload: any): Promise<any> {
  const { data } = await api.post(FORM_BUILDER_API_PATHS.pageLayout, payload);
  assertApiSuccess(data);
  return data.data;
}

export async function getFormSchema(module: string): Promise<any> {
  const { data } = await api.get(FORM_BUILDER_API_PATHS.getForm(module));
  // assertApiSuccess(data); // Depends on if get_form returns standard envelope
  return data;
}

export async function getFormSchemaById(id: string | number, moduleId?: string | number): Promise<any> {
  const url = moduleId
    ? `/modules/${moduleId}/layouts/${id}/`
    : FORM_BUILDER_API_PATHS.formById(id);
  const { data } = await api.get(url);
  return data;
}

export async function editFormSchema(
  id: string | number,
  payload: any,
  moduleId?: string | number,
  purpose?: string | null
): Promise<any> {
  if (purpose === "edit_layout" && moduleId) {
    const url = `/modules/${moduleId}/sections/bulk/`;
    const { data } = await api.post(url, payload);
    assertApiSuccess(data);
    return data.data;
  }

  const url = moduleId
    ? `/modules/${moduleId}/layouts/${id}/`
    : FORM_BUILDER_API_PATHS.formById(id);
  const { data } = await api.put(url, payload);
  assertApiSuccess(data);
  return data.data;
}
