export { mapApiErrorsToFieldStrings } from "./map-field-errors";
export {
  applyApiErrorsToForm,
  getApiFieldErrorMap,
  reportFormSubmitApiError,
  reportLocalFormSubmitApiError,
} from "./report-form-api-error.util";
export {
  DUPLICATE_ENTRY_ERROR_CODE,
  duplicateEntryFieldLabel,
  formatDuplicateEntryValue,
  parseDuplicateEntryConflict,
  type DuplicateEntryConflict,
} from "./duplicate-entry.util";
export { DuplicateEntryConflictModal } from "./components/duplicate-entry-conflict-modal";
export { DuplicateEntryFieldError } from "./components/duplicate-entry-field-error";
export { useDuplicateEntryConflict } from "./hooks/use-duplicate-entry-conflict";
export {
  capitalizeFirstLetter,
  rhfSanitizeOnChange,
  sanitizeAbbreviationInput,
  sanitizeAddressInput,
  sanitizeCompanyNameInput,
  sanitizeDescriptionInput,
  sanitizeEmailInput,
  sanitizeFieldInput,
  sanitizeNameInput,
  sanitizeTitleInput,
  rhfRegisterOptions,
  type FieldInputKind,
} from "./field-input.util";
export {
  clampFieldLength,
  FIELD_MAX_LENGTH,
  getMaxLengthForFieldKind,
  rhfClampMaxLength,
} from "./field-max-length.util";
export {
  zTrimmedNonEmpty,
  zRequiredName,
  zRequiredCompanyName,
  zRequiredTitle,
  zEmail,
  zHexColour6,
} from "./schemas";
