import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { getRawApiErrors, isFieldKeyedApiErrors } from "@/core/errors/api-field-errors.util";
import { markApiErrorToasted, toastApiError } from "@/core/errors/api-error-toast.util";
import { mapApiErrorsToFieldStrings } from "@/shared/form/map-field-errors";

export function getApiFieldErrorMap(error: unknown): Record<string, string> {
  const raw = getRawApiErrors(error);
  if (!isFieldKeyedApiErrors(raw)) return {};
  return mapApiErrorsToFieldStrings(raw);
}

/**
 * Apply API field errors onto a react-hook-form instance.
 * Returns true when at least one field error was set (caller should skip toast).
 */
export function applyApiErrorsToForm<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  error: unknown,
  options?: {
    /** Map API field keys → form field paths when names differ. */
    fieldMap?: Partial<Record<string, Path<TFieldValues>>>;
  },
): boolean {
  const fieldErrors = getApiFieldErrorMap(error);
  const keys = Object.keys(fieldErrors);
  if (keys.length === 0) return false;

  let applied = false;
  for (const [apiKey, message] of Object.entries(fieldErrors)) {
    if (apiKey === "non_field_errors" || apiKey === "detail" || apiKey === "__all__") {
      continue;
    }
    const formPath = (options?.fieldMap?.[apiKey] ?? apiKey) as Path<TFieldValues>;
    setError(formPath, { type: "server", message });
    applied = true;
  }
  return applied;
}

/**
 * Prefer inline field errors; toast only when there are no mappable field errors.
 */
export function reportFormSubmitApiError<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  fallbackToast?: string,
  options?: {
    fieldMap?: Partial<Record<string, Path<TFieldValues>>>;
  },
): void {
  if (applyApiErrorsToForm(setError, error, options)) {
    markApiErrorToasted(error);
    return;
  }
  toastApiError(error, fallbackToast);
}
