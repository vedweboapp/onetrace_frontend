import type {
  JobFormSubmissionValue,
  NormalizedFormSection,
} from "@/features/job-forms/types/job-form-submission.types";

function serializeFieldValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseStoredValue(raw: string, fieldType?: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const norm = (fieldType ?? "").toLowerCase();
  if (norm === "checkbox") {
    return trimmed === "true" || trimmed === "1";
  }
  if (["multi_select", "file_upload", "user"].includes(norm)) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : trimmed;
    } catch {
      return trimmed;
    }
  }
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export function mapFormDataToSubmissionValues(
  formData: Record<string, unknown>,
  sections: NormalizedFormSection[],
): Array<{ field_id: number; value: string }> {
  const out: Array<{ field_id: number; value: string }> = [];

  for (const section of sections) {
    if (section.is_subform) continue;
    for (const field of section.fields) {
      if (field.id == null || !field.api_name) continue;
      const raw = formData[field.api_name];
      if (raw === undefined || raw === null || raw === "") continue;
      out.push({
        field_id: field.id,
        value: serializeFieldValue(raw),
      });
    }
  }

  return out;
}

export function mapSubmissionValuesToFormDefaults(
  values: JobFormSubmissionValue[],
  sections: NormalizedFormSection[],
  apiNameByFieldId: Map<number, string>,
  fieldTypeByFieldId: Map<number, string>,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const row of values) {
    const apiName = row.api_name ?? apiNameByFieldId.get(row.field_id);
    if (!apiName) continue;
    defaults[apiName] = parseStoredValue(
      row.value,
      fieldTypeByFieldId.get(row.field_id),
    );
  }

  for (const section of sections) {
    if (section.is_subform) continue;
    for (const field of section.fields) {
      if (!field.api_name || defaults[field.api_name] !== undefined) continue;
      defaults[field.api_name] = "";
    }
  }

  return defaults;
}

export function enrichSubmissionValues(
  values: Array<{ field_id: number; value: string }>,
  fieldLabelByFieldId: Map<number, string>,
  apiNameByFieldId: Map<number, string>,
): JobFormSubmissionValue[] {
  return values.map((row) => ({
    field_id: row.field_id,
    value: row.value,
    field_label: fieldLabelByFieldId.get(row.field_id) ?? null,
    api_name: apiNameByFieldId.get(row.field_id) ?? null,
  }));
}
