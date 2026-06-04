import api from "@/core/api/axios";
import type { FormListItem, FormsPagination } from "@/features/forms/types/form.types";
import { parseFormsListResponse, parseFormsPaginationResponse } from "@/features/forms/utils/parse-forms-list.util";
import { FORMS_PATHS } from "./forms.paths";

type FormsRequestOptions = {
  silent?: boolean;
};

export type ProjectFormOption = { id: number; name: string };

export async function fetchFormsPage(
  page = 1,
  pageSize = 500,
  params?: Record<string, string | number | boolean | undefined>,
  options?: FormsRequestOptions,
): Promise<{ items: FormListItem[]; pagination: FormsPagination }> {
  const { data } = await api.get(FORMS_PATHS.list, {
    params: { page, page_size: pageSize, ...params },
    skipErrorToast: options?.silent === true,
  });
  return { items: parseFormsListResponse(data), pagination: parseFormsPaginationResponse(data) };
}

export async function patchForm(id: number, body: Partial<FormListItem>): Promise<FormListItem> {
  const { data } = await api.patch(`${FORMS_PATHS.list}${id}/`, body);
  if (data && typeof data === "object" && "data" in (data as Record<string, unknown>)) {
    return (data as { data: FormListItem }).data;
  }
  return data as FormListItem;
}

export async function fetchProjectFormsByProject(
  projectId: number,
  options?: FormsRequestOptions,
): Promise<ProjectFormOption[]> {
  const { data } = await api.get("project-forms/", {
    params: { project_id: projectId },
    skipErrorToast: options?.silent === true,
  });

  return parseFormsListResponse(data).map(({ id, name }) => ({ id, name }));
}
