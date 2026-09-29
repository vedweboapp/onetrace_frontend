import type {
  NormalizedFormField,
  NormalizedFormSection,
  NormalizedJobFormSchema,
} from "@/features/job-forms/types/job-form-submission.types";

function coerceFieldId(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

function normalizeField(raw: Record<string, unknown>, index: number): NormalizedFormField {
  const properties = (raw.properties as Record<string, unknown> | undefined) ?? {};
  const validation = (raw.validation as Record<string, unknown> | undefined) ?? {};
  const validationRules =
    (properties.validation_rules as Record<string, unknown> | undefined) ?? {};

  const editorType =
    raw.editor_type ??
    validationRules.editorType ??
    validationRules.editor_type;

  const isRequired =
    raw.required === true ||
    properties.is_required === true ||
    validation.is_required === true;

  const isReadOnly =
    raw.readOnly === true ||
    properties.is_readonly === true ||
    validation.is_readonly === true;

  return {
    ...raw,
    id: coerceFieldId(raw.id),
    api_name: String(raw.api_name ?? raw.name ?? `field_${index}`),
    field_label: String(raw.field_label ?? raw.label ?? raw.api_name ?? `Field ${index + 1}`),
    field_type: String(raw.field_type ?? raw.type ?? "single_line"),
    order: (raw.order ?? raw.sequence ?? index) as number,
    editor_type: editorType,
    options: Array.isArray(raw.options) ? raw.options : [],
    placeholder:
      typeof raw.placeholder === "string"
        ? raw.placeholder
        : typeof properties.placeholder === "string"
          ? properties.placeholder
          : undefined,
    help_text: typeof raw.help_text === "string" ? raw.help_text : undefined,
    required: isRequired,
    readOnly: isReadOnly,
  };
}

function normalizeSection(raw: Record<string, unknown>, index: number): NormalizedFormSection {
  const fieldsRaw = Array.isArray(raw.fields) ? raw.fields : [];
  const fields = [...fieldsRaw]
    .sort(
      (a, b) =>
        Number((a as { order?: number; sequence?: number }).order ?? (a as { sequence?: number }).sequence ?? 0) -
        Number((b as { order?: number; sequence?: number }).order ?? (b as { sequence?: number }).sequence ?? 0),
    )
    .map((field, fieldIndex) => normalizeField(field as Record<string, unknown>, fieldIndex));

  return {
    ...raw,
    name: String(raw.name ?? raw.sectionHeader ?? `Section ${index + 1}`),
    sequence: Number(raw.sequence ?? index + 1),
    column_count: Number(raw.column_count ?? raw.columns ?? 2),
    is_subform: raw.is_subform === true,
    subform_field_name: raw.subform_field_name as string | undefined,
    fields,
  };
}

export function normalizeProjectFormMetadataResponse(payload: unknown): NormalizedJobFormSchema {
  const root =
    payload && typeof payload === "object" && "data" in (payload as object)
      ? (payload as { data: unknown }).data
      : payload;
  const layoutObj = root as Record<string, unknown>;
  const layoutNested = layoutObj?.layout as Record<string, unknown> | undefined;
  const name = String(layoutObj?.name ?? layoutNested?.name ?? "Form");
  const sectionsRaw =
    (layoutObj?.sections as unknown[]) ??
    ((layoutObj?.layout as Record<string, unknown> | undefined)?.sections as unknown[]) ??
    [];
  const rulesRaw = (layoutObj?.rules as unknown[]) ?? [];

  const sections = [...sectionsRaw]
    .sort(
      (a, b) =>
        Number((a as { sequence?: number }).sequence ?? 0) -
        Number((b as { sequence?: number }).sequence ?? 0),
    )
    .map((section, index) => normalizeSection(section as Record<string, unknown>, index));

  return {
    name,
    sections,
    rules: Array.isArray(rulesRaw) ? rulesRaw : [],
  };
}

export function applyReadOnlyToSections(
  sections: NormalizedFormSection[],
  readOnly: boolean,
): NormalizedFormSection[] {
  if (!readOnly) return sections;
  return sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => ({ ...field, readOnly: true })),
  }));
}

export function buildFieldMaps(sections: NormalizedFormSection[]) {
  const apiNameByFieldId = new Map<number, string>();
  const fieldLabelByFieldId = new Map<number, string>();
  const fieldTypeByFieldId = new Map<number, string>();

  for (const section of sections) {
    for (const field of section.fields) {
      if (field.id == null) continue;
      apiNameByFieldId.set(field.id, field.api_name);
      fieldLabelByFieldId.set(field.id, field.field_label);
      fieldTypeByFieldId.set(field.id, field.field_type);
    }
  }

  return { apiNameByFieldId, fieldLabelByFieldId, fieldTypeByFieldId };
}

/**
 * Append read-only fields for submission files whose api_name / field_id is not
 * already present in the layout (e.g. Signature submitted from mobile but removed
 * from the form builder later). Keeps submitted evidence visible on review screens.
 */
export function enrichSectionsWithSubmissionFiles(
  sections: NormalizedFormSection[],
  files:
    | Array<{
        field_id?: number | null;
        field_label?: string | null;
        api_name?: string | null;
        field_type?: string | null;
        file_url?: string | null;
        is_deleted?: boolean;
      }>
    | undefined,
): NormalizedFormSection[] {
  if (!files?.length) return sections;

  const knownApiNames = new Set<string>();
  const knownFieldIds = new Set<number>();
  for (const section of sections) {
    for (const field of section.fields) {
      if (field.api_name) knownApiNames.add(field.api_name);
      if (field.id != null) knownFieldIds.add(field.id);
    }
  }

  const orphans: NormalizedFormField[] = [];
  const seenApi = new Set<string>();
  for (const file of files) {
    if (file.is_deleted) continue;
    const apiName = file.api_name?.trim();
    if (!apiName || !file.file_url?.trim() || seenApi.has(apiName)) continue;
    seenApi.add(apiName);
    const fieldId =
      typeof file.field_id === "number" && Number.isFinite(file.field_id) && file.field_id > 0
        ? file.field_id
        : undefined;
    if (knownApiNames.has(apiName) || (fieldId != null && knownFieldIds.has(fieldId))) {
      continue;
    }
    orphans.push({
      id: fieldId,
      api_name: apiName,
      field_label: String(file.field_label?.trim() || apiName),
      field_type: String(file.field_type?.trim() || "file_upload"),
      readOnly: true,
      order: orphans.length,
    });
  }

  if (orphans.length === 0) return sections;

  const next = sections.map((section) => ({
    ...section,
    fields: [...section.fields],
  }));
  const targetIdx = (() => {
    for (let i = next.length - 1; i >= 0; i--) {
      if (!next[i]?.is_subform) return i;
    }
    return -1;
  })();

  if (targetIdx >= 0) {
    next[targetIdx] = {
      ...next[targetIdx],
      fields: [...next[targetIdx].fields, ...orphans],
    };
    return next;
  }

  return [
    ...next,
    {
      name: "Submitted files",
      column_count: 1,
      fields: orphans,
    },
  ];
}

/**
 * Build a read-only form schema from a submitted-forms detail payload
 * when project_form_id / metadata is not available (worker submissions API).
 */
export function synthesizeFormSectionsFromSubmission(input: {
  values?: Array<{
    field_id: number;
    value?: string;
    field_label?: string | null;
    api_name?: string | null;
    field_type?: string | null;
  }>;
  files?: Array<{
    field_id: number;
    field_label?: string | null;
    api_name?: string | null;
    field_type?: string | null;
    file_url?: string;
    is_deleted?: boolean;
  }>;
}): NormalizedFormSection[] {
  const values = Array.isArray(input.values) ? input.values : [];
  const files = Array.isArray(input.files) ? input.files : [];
  const byFieldId = new Map<number, NormalizedFormField>();

  for (const row of values) {
    const fieldId = coerceFieldId(row.field_id);
    if (fieldId == null) continue;
    const apiName = String(row.api_name?.trim() || `field_${fieldId}`);
    byFieldId.set(fieldId, {
      id: fieldId,
      api_name: apiName,
      field_label: String(row.field_label?.trim() || apiName),
      field_type: String(row.field_type?.trim() || "single_line"),
      readOnly: true,
    });
  }

  for (const file of files) {
    if (file.is_deleted) continue;
    const fieldId = coerceFieldId(file.field_id);
    if (fieldId == null) continue;
    const existing = byFieldId.get(fieldId);
    const apiName = String(file.api_name?.trim() || existing?.api_name || `field_${fieldId}`);
    byFieldId.set(fieldId, {
      id: fieldId,
      api_name: apiName,
      field_label: String(file.field_label?.trim() || existing?.field_label || apiName),
      field_type: String(file.field_type?.trim() || existing?.field_type || "file_upload"),
      readOnly: true,
    });
  }

  const fields = Array.from(byFieldId.values());
  if (fields.length === 0) return [];
  return [
    {
      name: "Submission",
      column_count: 1,
      fields,
    },
  ];
}
