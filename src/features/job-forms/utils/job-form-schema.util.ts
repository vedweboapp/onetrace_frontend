import type {
  NormalizedFormField,
  NormalizedFormSection,
  NormalizedJobFormSchema,
} from "@/features/job-forms/types/job-form-submission.types";

function normalizeField(raw: Record<string, unknown>, index: number): NormalizedFormField {
  const properties = (raw.properties as Record<string, unknown> | undefined) ?? {};
  const validationRules =
    (properties.validation_rules as Record<string, unknown> | undefined) ?? {};

  const editorType =
    raw.editor_type ??
    validationRules.editorType ??
    validationRules.editor_type;

  return {
    ...raw,
    id: typeof raw.id === "number" ? raw.id : undefined,
    api_name: String(raw.api_name ?? raw.name ?? `field_${index}`),
    field_label: String(raw.field_label ?? raw.label ?? raw.api_name ?? `Field ${index + 1}`),
    field_type: String(raw.field_type ?? raw.type ?? "single_line"),
    order: (raw.order ?? raw.sequence ?? index) as number,
    editor_type: editorType,
    options: raw.options ?? [],
    readOnly: raw.readOnly === true,
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
