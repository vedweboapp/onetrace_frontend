import api from "@/core/api/axios";
import { assertApiSuccess, type ApiEnvelope } from "@/core/types/api.types";
import { RULE_PATHS } from "@/features/rules/api/rule.paths";

/** Summary row (list API) */
export type FormRenderRuleSummary = {
  id: number; // aliased from form_id
  form_type: string;
  form_id: number;
  form_name: string;
  project_form: number | null;
  dynamic_form: number | null;
  totalcount_rules: number;
  has_field_mapping: boolean;
  last_updated_at: string | null;
};

/** Individual rule (detail API) */
export type FormRenderRuleItem = {
  id: number;
  organization: number;
  project_form: number;
  section_code: string;
  section_label: string;
  display_order: number;
  action_api_names: string[];
  trigger_condition: {
    field: string;
    value: string;
    operator: string;
  } | null;
  missing_data_behavior: string;
  default_category: string;
  default_timescale: string;
  default_severity: string;
  action_delimiter: string;
  ignore_values: string[];
  created_at: string;
  modified_at: string | null;
};

function normalizeList<T>(data: ApiEnvelope<T[]> | T[]): T[] {
  if (Array.isArray(data)) return data;
  assertApiSuccess(data);
  if (Array.isArray(data.data)) return data.data;
  if (
    data.data &&
    typeof data.data === "object" &&
    "results" in data.data &&
    Array.isArray((data.data as { results?: unknown }).results)
  ) {
    return (data.data as { results: T[] }).results;
  }
  return [];
}

export async function fetchFormRenderRules(): Promise<FormRenderRuleSummary[]> {
  const { data } = await api.get<ApiEnvelope<FormRenderRuleSummary[]> | FormRenderRuleSummary[]>(
    RULE_PATHS.list,
  );
  return normalizeList(data).map((r) => ({ ...r, id: r.form_id }));
}

export async function fetchFormRenderRulesByProjectForm(
  projectFormId: number | string,
): Promise<FormRenderRuleItem[]> {
  const { data } = await api.get<ApiEnvelope<FormRenderRuleItem[]> | FormRenderRuleItem[]>(
    RULE_PATHS.byProjectForm(projectFormId),
  );
  return normalizeList(data);
}

export type CreateFormRenderRulePayload = {
  project_form: number;
  dynamic_form?: number | null;
  section_code: string;
  section_label: string;
  display_order: number;
  action_api_names: string[];
  trigger_condition: {
    field: string;
    value: string;
    operator: string;
  } | null;
  missing_data_behavior: string;
  default_category: string;
  default_timescale: string;
  default_severity: string;
  action_delimiter: string;
  ignore_values: string[];
};

export async function createFormRenderRule(
  payload: CreateFormRenderRulePayload,
): Promise<FormRenderRuleItem> {
  const { data } = await api.post<ApiEnvelope<FormRenderRuleItem> | FormRenderRuleItem>(
    RULE_PATHS.create,
    payload,
  );
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data);
    return data.data;
  }
  return data;
}

export type ProjectFormOption = {
  id: number;
  name: string;
};

export type FormMetadataField = {
  id?: number | string;
  api_name: string;
  label: string;
};

export type FormMetadataSection = {
  id: number | string;
  code: string;
  label: string;
  fields: FormMetadataField[];
};

export async function fetchProjectFormOptions(): Promise<ProjectFormOption[]> {
  const { data } = await api.get<unknown>(RULE_PATHS.projectForms);
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "data" in data
    ? Array.isArray((data as { data: unknown }).data)
      ? (data as { data: unknown[] }).data
      : (data as { data?: { results?: unknown[] } }).data?.results ?? []
    : data && typeof data === "object" && "results" in data
    ? (data as { results: unknown[] }).results
    : [];

  return raw
    .map((item) => {
      const rec = item as Record<string, unknown>;
      const id = Number(rec.id);
      const name = String(rec.name ?? rec.form_name ?? rec.title ?? `Form #${id}`);
      return Number.isFinite(id) ? { id, name } : null;
    })
    .filter((x): x is ProjectFormOption => x !== null);
}

export async function fetchProjectFormMetadata(
  projectFormId: number | string,
): Promise<FormMetadataSection[]> {
  const { data } = await api.get<unknown>(RULE_PATHS.projectFormMetadata(projectFormId));
  const root =
    data && typeof data === "object" && "data" in data
      ? (data as { data: Record<string, unknown> }).data
      : (data as Record<string, unknown>);

  const rawSections = Array.isArray(root?.sections)
    ? (root.sections as Record<string, unknown>[])
    : [];

  return rawSections.map((sec, idx) => {
    const rawFields = Array.isArray(sec.fields)
      ? (sec.fields as Record<string, unknown>[])
      : [];
    const fields: FormMetadataField[] = rawFields
      .map((f) => ({
        id: (f.id as number | string | undefined) ?? undefined,
        api_name: String(f.api_name ?? f.name ?? f.key ?? ""),
        label: String(f.label ?? f.title ?? f.api_name ?? f.name ?? ""),
      }))
      .filter((f) => f.api_name.length > 0);

    const code = String(sec.section_code ?? sec.code ?? `c${idx + 1}`);
    const label = String(sec.section_label ?? sec.label ?? sec.title ?? sec.name ?? code);
    return {
      id: (sec.id as number | string | undefined) ?? code,
      code,
      label,
      fields,
    };
  });
}
