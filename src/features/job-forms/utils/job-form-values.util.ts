import type {
  JobFormSubmissionFile,
  JobFormSubmissionValue,
  NormalizedFormField,
  NormalizedFormSection,
} from "@/features/job-forms/types/job-form-submission.types";
import { Country } from "country-state-city";
import { currencyList } from "@/shared/form/components/currency-list";

const CURRENCY_CODES = new Set(currencyList.map((c) => c.value));

function isCurrencyCode(val: string): boolean {
  const trimmed = val.trim().toUpperCase();
  return trimmed.length === 3 && CURRENCY_CODES.has(trimmed);
}

function isNumericAmount(val: string): boolean {
  return /^\d+(\.\d+)?$/.test(val.trim());
}

function normalizeCountryValue(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return trimmed;
  if (trimmed.length === 2 && /^[A-Z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  const match = Country.getAllCountries().find(
    (c) =>
      c.name.toLowerCase() === trimmed.toLowerCase() ||
      c.isoCode.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ? match.isoCode : trimmed;
}

function groupSubmissionValuesByApiName(
  values: JobFormSubmissionValue[] | undefined,
  apiNameByFieldId: Map<number, string>,
): Map<string, JobFormSubmissionValue[]> {
  const grouped = new Map<string, JobFormSubmissionValue[]>();
  for (const row of values ?? []) {
    const apiName =
      row.api_name?.trim() ?? apiNameByFieldId.get(coerceFieldId(row.field_id) ?? -1) ?? "";
    if (!apiName) continue;
    const list = grouped.get(apiName) ?? [];
    list.push(row);
    grouped.set(apiName, list);
  }
  return grouped;
}

function groupSubmissionFilesByApiName(
  files: JobFormSubmissionFile[] | undefined,
  apiNameByFieldId: Map<number, string>,
): Map<string, JobFormSubmissionFile[]> {
  const grouped = new Map<string, JobFormSubmissionFile[]>();
  for (const file of files ?? []) {
    if (file.is_deleted) continue;
    const fieldId = coerceFieldId(file.field_id);
    const apiName =
      file.api_name?.trim() ?? (fieldId != null ? apiNameByFieldId.get(fieldId) : undefined) ?? "";
    if (!apiName || !file.file_url?.trim()) continue;
    const list = grouped.get(apiName) ?? [];
    list.push(file);
    grouped.set(apiName, list);
  }
  return grouped;
}

function resolveCurrencyValue(rows: JobFormSubmissionValue[]): { amount: string; currency: string } {
  let amount = "";
  let currency = "";
  for (const row of rows) {
    const val = row.value?.trim() ?? "";
    if (!val) continue;
    if (isCurrencyCode(val)) {
      currency = val.toUpperCase();
    } else if (isNumericAmount(val)) {
      amount = val;
    } else if (!amount) {
      amount = val;
    }
  }
  return { amount, currency };
}

function resolveScalarValue(
  rows: JobFormSubmissionValue[],
  fieldType: string | undefined,
): unknown {
  if (rows.length === 0) return "";
  const norm = (fieldType ?? rows[0]?.field_type ?? "").toLowerCase();
  if (norm === "currency") {
    return resolveCurrencyValue(rows);
  }
  const last = rows[rows.length - 1];
  const parsed = parseStoredValue(last.value, fieldType ?? last.field_type ?? undefined);
  if (norm === "country" && typeof parsed === "string") {
    return normalizeCountryValue(parsed);
  }
  return parsed;
}

function resolveFileFieldValue(
  files: JobFormSubmissionFile[],
  fieldType: string | undefined,
): unknown {
  const urls = files.map((f) => f.file_url).filter(Boolean);
  if (urls.length === 0) return "";
  const norm = (fieldType ?? files[0]?.field_type ?? "").toLowerCase();
  if (norm === "image_upload" && urls.length > 1) {
    return urls;
  }
  return urls[urls.length - 1];
}

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

function isFileLikeValue(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function isDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:");
}

function coerceFileValue(value: unknown, fileName: string): File | null {
  if (isFileLikeValue(value)) return value;
  if (!isDataUrl(value)) return null;

  const [header, base64] = value.split(",");
  if (!header || !base64) return null;

  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";
  const binary = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
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

      if (field.field_type === "currency" && raw && typeof raw === "object" && !Array.isArray(raw)) {
        const currencyValue = raw as { amount?: unknown; currency?: unknown };
        const initialObj =
          initial && typeof initial === "object" && !Array.isArray(initial)
            ? (initial as { amount?: unknown; currency?: unknown })
            : undefined;
        const amount = currencyValue.amount != null ? String(currencyValue.amount) : "";
        const currency = currencyValue.currency != null ? String(currencyValue.currency) : "";
        const initialAmount =
          initialObj?.amount != null ? String(initialObj.amount) : typeof initial === "string" ? "" : "";
        const initialCurrency =
          initialObj?.currency != null ? String(initialObj.currency) : typeof initial === "string" ? String(initial) : "";

        if (amount && !areValuesEqual(amount, initialAmount)) {
          out.push({ field_id: field.id, value: amount });
        }
        if (currency && !areValuesEqual(currency, initialCurrency)) {
          out.push({ field_id: field.id, value: currency });
        }
        continue;
      }

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
    job_pin_id?: number;
    dynamic_form_id?: number | string | null;
  },
): FormData {
  const values = mapFormDataToSubmissionValues(formData, sections, extra?.defaultValues);

  const fd = new FormData();
  const hasJobPinId = extra?.job_pin_id != null;
  if (!hasJobPinId) {
    fd.append("job_form_id", String(jobFormId));
  }
  fd.append("status", extra?.status ?? "submitted");
  if (extra?.remarks != null) {
    fd.append("remarks", extra.remarks);
  }
  if (hasJobPinId) {
    fd.append("job_pin_id", String(extra.job_pin_id));
  }
  // Include dynamic_form_id in the submission if provided
  if (extra && (extra as any).dynamic_form_id != null && String((extra as any).dynamic_form_id).trim() !== "") {
    fd.append("dynamic_form_id", String((extra as any).dynamic_form_id));
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

      const hasFieldKey = field.api_name in formData;
      const val = hasFieldKey ? formData[field.api_name] : undefined;
      const fileValue = coerceFileValue(val, field.api_name);
      const hasExistingFile =
        typeof extra?.defaultValues?.[field.api_name] === "string" &&
        extra.defaultValues[field.api_name] !== "";

      if (fileValue) {
        fd.append(`values[${fileIndex}][field_id]`, String(field.id));
        fd.append(`values[${fileIndex}][field_type]`, field.field_type ?? "file");
        fd.append(`values[${fileIndex}][value]`, fileValue, fileValue.name);
        fileIndex++;
        continue;
      }

      if (!FILE_FIELD_TYPES.has(field.field_type)) continue;

      if (!hasFieldKey) {
        if (!hasExistingFile && field.field_type === "file_upload") {
          fd.append(`values[${fileIndex}][field_id]`, String(field.id));
          fd.append(`values[${fileIndex}][field_type]`, field.field_type ?? "file");
          fd.append(`values[${fileIndex}][value]`, "");
          fileIndex++;
        }
        continue;
      }

      if (hasExistingFile && (val === null || val === "" || val === undefined)) {
        fd.append(`values[${fileIndex}][field_id]`, String(field.id));
        fd.append(`values[${fileIndex}][field_type]`, field.field_type ?? "file");
        fd.append(`values[${fileIndex}][is_deleted]`, "true");
        fileIndex++;
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
  const valuesByApiName = groupSubmissionValuesByApiName(values, apiNameByFieldId);
  const filesByApiName = groupSubmissionFilesByApiName(files, apiNameByFieldId);
  const defaults: Record<string, unknown> = {};

  const applyField = (field: NormalizedFormField) => {
    if (!field.api_name) return;
    const fieldType =
      field.field_type ??
      (field.id != null ? fieldTypeByFieldId.get(field.id) : undefined) ??
      valuesByApiName.get(field.api_name)?.[0]?.field_type ??
      filesByApiName.get(field.api_name)?.[0]?.field_type;
    const normType = (fieldType ?? "").toLowerCase();
    const fileRows = filesByApiName.get(field.api_name) ?? [];
    const valueRows = valuesByApiName.get(field.api_name) ?? [];

    if (FILE_FIELD_TYPES.has(normType) && fileRows.length > 0) {
      defaults[field.api_name] = resolveFileFieldValue(fileRows, fieldType);
      return;
    }

    if (valueRows.length > 0) {
      defaults[field.api_name] = resolveScalarValue(valueRows, fieldType);
      return;
    }

    if (defaults[field.api_name] === undefined) {
      defaults[field.api_name] = normType === "image_upload" ? null : "";
    }
  };

  for (const section of sections) {
    if (section.is_subform) continue;
    for (const field of section.fields) {
      applyField(field);
    }
  }

  for (const apiName of valuesByApiName.keys()) {
    if (defaults[apiName] !== undefined) continue;
    const valueRows = valuesByApiName.get(apiName) ?? [];
    defaults[apiName] = resolveScalarValue(
      valueRows,
      valueRows[0]?.field_type ?? fieldTypeByFieldId.get(coerceFieldId(valueRows[0]?.field_id) ?? -1),
    );
  }

  for (const apiName of filesByApiName.keys()) {
    if (defaults[apiName] !== undefined && defaults[apiName] !== "" && defaults[apiName] !== null) {
      continue;
    }
    const fileRows = filesByApiName.get(apiName) ?? [];
    defaults[apiName] = resolveFileFieldValue(
      fileRows,
      fileRows[0]?.field_type ?? fieldTypeByFieldId.get(coerceFieldId(fileRows[0]?.field_id) ?? -1),
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
