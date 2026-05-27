import api from "@/core/api/axios";
import type { FormListItem } from "@/features/forms/types/form.types";
import { parseFormsListResponse } from "@/features/forms/utils/parse-forms-list.util";
import { FORMS_PATHS } from "./forms.paths";

type FormsRequestOptions = {
  silent?: boolean;
};

export async function fetchFormsPage(
  page = 1,
  pageSize = 500,
  params?: Record<string, string | number | boolean | undefined>,
  options?: FormsRequestOptions,
): Promise<{ items: FormListItem[] }> {
  const { data } = await api.get(FORMS_PATHS.list, {
    params: { page, page_size: pageSize, ...params },
    skipErrorToast: options?.silent === true,
  });
  return { items: parseFormsListResponse(data) };
}
