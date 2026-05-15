import api from "@/core/api/axios";
import { FORM_BUILDER_API_PATHS } from "./form-builder.paths";
import { assertApiSuccess } from "@/core/types/api.types";

export async function getFormsList(params?: any): Promise<any[]> {
  const { data } = await api.get(FORM_BUILDER_API_PATHS.formsList, { params });
  // Some endpoints might return the array directly or wrapped
  return data; 
}

export async function createFormLayout(module: string, payload: any): Promise<any> {
  const { data } = await api.post(FORM_BUILDER_API_PATHS.saveLayout(module), payload);
  assertApiSuccess(data);
  return data.data;
}

export async function getFormSchema(module: string): Promise<any> {
  const { data } = await api.get(FORM_BUILDER_API_PATHS.getForm(module));
  // assertApiSuccess(data); // Depends on if get_form returns standard envelope
  return data;
}

export async function getFormSchemaById(id: string | number): Promise<any> {
  const { data } = await api.get(FORM_BUILDER_API_PATHS.formById(id));
  return data;
}

export async function editFormSchema(id: string | number, payload: any): Promise<any> {
  const { data } = await api.put(FORM_BUILDER_API_PATHS.formById(id), payload);
  assertApiSuccess(data);
  return data.data;
}
