import type {
  JobFormSubmissionFile,
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

/** Field types whose values are binary files, not JSON-serialisable strings. */
const FILE_FIELD_TYPES = new Set(["signature", "file_upload", "image_upload", "file"]);

function areValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // Treat empty/falsy values (null, undefined, "") as equal
  const aEmpty = a === undefined || a === null || a === "";
  const bEmpty = b === undefined || b === null || b === "";
  if (aEmpty && bEmpty) return true;
  if (aEmpty !== bEmpty) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => areValuesEqual(v, b[i]));
  }
  if (a && typeof a === "object" && b && typeof b === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => areValuesEqual((a as any)[k], (b as any)[k]));
  }
  return false;
}

export function mapFormDataToSubmissionValues(
  formData: Record<string, unknown>,
  sections: NormalizedFormSection[],
  defaultValues?: Record<string, unknown>,
): Array<{ field_id: number; value: string }> {
  const out: Array<{ field_id: number; value: string }> = [];

  for (const section of sections) {
    if (section.is_subform) continue;
    for (const field of section.fields) {
      if (field.id == null || !field.api_name) continue;
      
      // Untouched field (not present in formData under changesOnly) -> do not send
      if (!(field.api_name in formData)) continue;

      const raw = formData[field.api_name];
      const initial = defaultValues?.[field.api_name];

      // File-type fields are handled exclusively as binary multipart entries.
      if (FILE_FIELD_TYPES.has(field.field_type)) continue;
      // File objects are sent as multipart entries — skip them from the JSON values array
      if (typeof File !== "undefined" && raw instanceof File) continue;

      // If it is really unchanged (including empty-to-empty changes), do not send
      if (areValuesEqual(raw, initial)) {
        continue;
      }

      out.push({
        field_id: field.id,
        value: serializeFieldValue(raw),
      });
    }
  }

  return out;
}

/**
 * Builds a multipart FormData for a job-form submission.
 * - Non-file field values are serialised into a JSON `payload` field.
 * - File fields (signature, file_upload, image_upload) are appended as binary entries.
 *
 * Usage in the API layer:
 *   const fd = buildJobFormSubmissionFormData(jobFormId, data, sections);
 *   await api.post(path, fd, { headers: { "Content-Type": "multipart/form-data" } });
 */
export function buildJobFormSubmissionFormData(
  jobFormId: number,
  formData: Record<string, unknown>,
  sections: NormalizedFormSection[],
  extra?: {
    status?: string;
    remarks?: string;
    submissionId?: number;
    defaultValues?: Record<string, unknown>;
  },
): FormData {
  const values = mapFormDataToSubmissionValues(formData, sections, extra?.defaultValues);

  const fd = new FormData();
  fd.append("job_form_id", String(jobFormId));
  fd.append("status", extra?.status ?? "submitted");
  if (extra?.remarks != null) {
    fd.append("remarks", extra.remarks);
  }
  
  // Only include the values key if there are changed/dirty fields
  if (values.length > 0) {
    fd.append("values", JSON.stringify(values));
  }

  // Append binary file fields using indexed values[index] structure
  let fileIndex = values.length;
  for (const section of sections) {
    if (section.is_subform) continue;
    for (const field of section.fields) {
      if (!field.api_name || field.id == null) continue;
      
      // Untouched field -> do not send
      if (!(field.api_name in formData)) continue;

      const val = formData[field.api_name];
      if (typeof File !== "undefined" && val instanceof File) {
        fd.append(`values[${fileIndex}][field_id]`, String(field.id));
        fd.append(`values[${fileIndex}][field_type]`, field.field_type ?? "file");
        fd.append(`values[${fileIndex}][value]`, val, val.name);
        fileIndex++;
      } else if (FILE_FIELD_TYPES.has(field.field_type)) {
        // If file field was cleared and had an existing file URL, send is_deleted: true
        const hasExistingFile =
          typeof extra?.defaultValues?.[field.api_name] === "string" &&
          extra.defaultValues[field.api_name] !== "";
        if (hasExistingFile && (val === null || val === "" || val === undefined)) {
          fd.append(`values[${fileIndex}][field_id]`, String(field.id));
          fd.append(`values[${fileIndex}][field_type]`, field.field_type ?? "file");
          fd.append(`values[${fileIndex}][is_deleted]`, "true");
          fileIndex++;
        }
      }
    }
  }

  return fd;
}

export function mapSubmissionValuesToFormDefaults(
  values: JobFormSubmissionValue[] | undefined,
  sections: NormalizedFormSection[],
  apiNameByFieldId: Map<number, string>,
  fieldTypeByFieldId: Map<number, string>,
  files?: JobFormSubmissionFile[],
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

  // Map file fields from the separate files array
  for (const file of files ?? []) {
    const fieldId = coerceFieldId(file.field_id);
    const apiName =
      file.api_name?.trim() ??
      (fieldId != null ? apiNameByFieldId.get(fieldId) : undefined);
    if (!apiName) continue;
    // Only set if not already populated by values
    if (defaults[apiName] === undefined || defaults[apiName] === "") {
      defaults[apiName] = file.file_url;
    }
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
