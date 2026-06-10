import type {
  JobFormSubmissionValue,
  NormalizedFormSection,
} from "@/features/job-forms/types/job-form-submission.types";

function coerceFieldId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

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
  if (norm === "number") {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : trimmed;
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
  values: JobFormSubmissionValue[] | undefined,
  sections: NormalizedFormSection[],
  apiNameByFieldId: Map<number, string>,
  fieldTypeByFieldId: Map<number, string>,
): Record<string, unknown> {
  const valueByFieldId = new Map<number, JobFormSubmissionValue>();
  const valueByApiName = new Map<string, JobFormSubmissionValue>();
  for (const row of values ?? []) {
    const fieldId = coerceFieldId(row.field_id);
    if (fieldId != null) valueByFieldId.set(fieldId, row);
    const apiName = row.api_name?.trim();
    if (apiName) valueByApiName.set(apiName, row);
  }

  const defaults: Record<string, unknown> = {};

  for (const section of sections) {
    if (section.is_subform) continue;
    for (const field of section.fields) {
      if (!field.api_name) continue;
      const row =
        (field.id != null ? valueByFieldId.get(field.id) : undefined) ??
        valueByApiName.get(field.api_name);
      if (row) {
        const fieldType =
          row.field_type ??
          (field.id != null ? fieldTypeByFieldId.get(field.id) : undefined) ??
          field.field_type;
        defaults[field.api_name] = parseStoredValue(row.value, fieldType);
      } else if (defaults[field.api_name] === undefined) {
        defaults[field.api_name] = "";
      }
    }
  }

  for (const row of values ?? []) {
    const apiName = row.api_name?.trim() ?? apiNameByFieldId.get(coerceFieldId(row.field_id) ?? -1);
    if (!apiName || defaults[apiName] !== undefined) continue;
    defaults[apiName] = parseStoredValue(
      row.value,
      row.field_type ?? fieldTypeByFieldId.get(coerceFieldId(row.field_id) ?? -1),
    );
  }

  return defaults;
}

export function enrichSubmissionValues(
  values:
    | Array<{
        field_id: number;
        value: string;
        field_label?: string | null;
        api_name?: string | null;
        field_type?: string | null;
      }>
    | undefined,
  fieldLabelByFieldId: Map<number, string>,
  apiNameByFieldId: Map<number, string>,
): JobFormSubmissionValue[] {
  return (values ?? []).map((row) => ({
    field_id: row.field_id,
    value: row.value,
    field_label: row.field_label ?? fieldLabelByFieldId.get(row.field_id) ?? null,
    api_name: row.api_name ?? apiNameByFieldId.get(row.field_id) ?? null,
    field_type: row.field_type ?? null,
  }));
}
