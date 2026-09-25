import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { getRawApiErrors, isFieldKeyedApiErrors } from "@/core/errors/api-field-errors.util";
import { localizeApiErrorMessage } from "@/core/errors/api-error-localize.util";
import { markApiErrorToasted, toastApiError } from "@/core/errors/api-error-toast.util";
import { mapApiErrorsToFieldStrings } from "@/shared/form/map-field-errors";

export function getApiFieldErrorMap(error: unknown): Record<string, string> {
  const raw = getRawApiErrors(error);
  if (!isFieldKeyedApiErrors(raw)) return {};
  const mapped = mapApiErrorsToFieldStrings(raw);
  const localized: Record<string, string> = {};
  for (const [key, message] of Object.entries(mapped)) {
    localized[key] = localizeApiErrorMessage(message);
  }
  return localized;
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
    setError(formPath, { type: "server", message: message.trim() });
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

/**
 * Same intent as `reportFormSubmitApiError`, for local `useState` error maps
 * (customization settings panels — not react-hook-form).
 */
export function reportLocalFormSubmitApiError(
  error: unknown,
  applyFieldErrors: (fieldErrors: Record<string, string>) => void,
  fallbackToast?: string,
  options?: {
    /** Map API field keys → local form error keys when names differ. */
    fieldMap?: Record<string, string>;
  },
): void {
  const fieldErrors = getApiFieldErrorMap(error);
  const mapped: Record<string, string> = {};

  for (const [apiKey, message] of Object.entries(fieldErrors)) {
    if (apiKey === "non_field_errors" || apiKey === "detail" || apiKey === "__all__") continue;
    const formKey = options?.fieldMap?.[apiKey] ?? apiKey;
    const trimmed = message.trim();
    if (trimmed) mapped[formKey] = trimmed;
  }

  if (Object.keys(mapped).length > 0) {
    applyFieldErrors(mapped);
    markApiErrorToasted(error);
    return;
  }

  toastApiError(error, fallbackToast);
}
