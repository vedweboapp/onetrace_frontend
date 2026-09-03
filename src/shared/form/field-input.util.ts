/**
 * Single entry-point for live input sanitization across forms and mass-update.
 * Prefer {@link sanitizeFieldInput} everywhere instead of ad-hoc per-field logic.
 */

import {
  clampFieldLength,
  FIELD_MAX_LENGTH,
  getMaxLengthForFieldKind,
  type FieldLengthKind,
} from "./field-max-length.util";

export type FieldInputKind = FieldLengthKind;

export type SanitizeFieldOptions = {
  maxLength?: number;
};

/** Uppercase the first character only (preserves the rest of the string). */
export function capitalizeFirstLetter(value: string): string {
  if (!value) return value;
  const first = value.charAt(0);
  const upperFirst = first.toUpperCase();
  if (first === upperFirst) return value;
  return `${upperFirst}${value.slice(1)}`;
}

function withMaxLength(kind: FieldInputKind, value: string, options?: SanitizeFieldOptions): string {
  return clampFieldLength(value, getMaxLengthForFieldKind(kind, options?.maxLength));
}

/**
 * Person / contact display names: no digits, letters + common punctuation,
 * first letter capitalized. Keeps trailing spaces while typing.
 */
export function sanitizeNameInput(raw: string, maxLength?: number): string {
  const cleaned = raw
    .replace(/[0-9]/g, "")
    .replace(/[^\p{L}\p{M}\s'.&\-]/gu, "");
  return withMaxLength("name", capitalizeFirstLetter(cleaned), { maxLength });
}

/** Vendor / client / company names — same rules as name, higher cap. */
export function sanitizeCompanyNameInput(raw: string, maxLength?: number): string {
  const cleaned = raw
    .replace(/[0-9]/g, "")
    .replace(/[^\p{L}\p{M}\s'.&\-]/gu, "");
  return withMaxLength("companyName", capitalizeFirstLetter(cleaned), { maxLength });
}

/** Abbreviation / short code — uppercase alphanumeric + common symbols. */
export function sanitizeAbbreviationInput(raw: string, maxLength?: number): string {
  const cleaned = raw.replace(/[^\p{L}\p{N}\-_./#]/gu, "").toUpperCase();
  return withMaxLength("abbreviation", cleaned, { maxLength });
}

/**
 * Titles / labels that may include numbers (items, projects, statuses).
 * First letter capitalized; strips control chars only.
 */
export function sanitizeTitleInput(raw: string, maxLength?: number): string {
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, "");
  return withMaxLength("title", capitalizeFirstLetter(cleaned), { maxLength });
}

/** Emails: strip spaces and lowercase while typing. */
export function sanitizeEmailInput(raw: string, maxLength?: number): string {
  return withMaxLength("email", raw.replace(/\s+/g, "").toLowerCase(), { maxLength });
}

/** Plain text: no transform beyond removing control characters. */
export function sanitizeTextInput(raw: string, maxLength?: number): string {
  return withMaxLength("text", raw.replace(/[\u0000-\u001F\u007F]/g, ""), { maxLength });
}

/** Address lines — strip control chars, preserve punctuation. */
export function sanitizeAddressInput(raw: string, maxLength?: number): string {
  return withMaxLength("address", raw.replace(/[\u0000-\u001F\u007F]/g, ""), { maxLength });
}

/** Long descriptions / remarks / notes. */
export function sanitizeDescriptionInput(raw: string, maxLength?: number): string {
  return withMaxLength("description", raw.replace(/[\u0000-\u001F\u007F]/g, ""), { maxLength });
}

export function sanitizeDigitsInput(raw: string, maxLength?: number): string {
  return withMaxLength("digits", raw.replace(/\D/g, ""), { maxLength });
}

export function sanitizeNumberInput(raw: string): string {
  let out = "";
  let hasDecimal = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if (ch === "." && !hasDecimal) {
      hasDecimal = true;
      out += ch;
    }
  }
  return clampFieldLength(out, FIELD_MAX_LENGTH.GENERIC_TEXT);
}

/** Phone typing sanitizer for simple text inputs (mass-update). Full UI uses SurfacePhoneField. */
export function sanitizePhoneDigitsInput(raw: string, maxLength?: number): string {
  const cap = maxLength ?? FIELD_MAX_LENGTH.PHONE_DIGITS;
  let out = "";
  for (let i = 0; i < raw.length && out.replace(/\D/g, "").length < cap; i++) {
    const ch = raw[i];
    if (ch === "+" && out.length === 0) {
      out += ch;
      continue;
    }
    if (ch >= "0" && ch <= "9") out += ch;
  }
  const digits = out.replace(/\D/g, "");
  if (digits.length <= cap) return out;
  if (out.startsWith("+")) {
    return `+${digits.slice(0, cap)}`;
  }
  return digits.slice(0, cap);
}

/** One function for every field kind — forms, mass-update, and controlled inputs. */
export function sanitizeFieldInput(
  kind: FieldInputKind,
  raw: string,
  options?: SanitizeFieldOptions,
): string {
  switch (kind) {
    case "name":
      return sanitizeNameInput(raw, options?.maxLength);
    case "companyName":
      return sanitizeCompanyNameInput(raw, options?.maxLength);
    case "abbreviation":
      return sanitizeAbbreviationInput(raw, options?.maxLength);
    case "title":
      return sanitizeTitleInput(raw, options?.maxLength);
    case "email":
      return sanitizeEmailInput(raw, options?.maxLength);
    case "address":
      return sanitizeAddressInput(raw, options?.maxLength);
    case "description":
      return sanitizeDescriptionInput(raw, options?.maxLength);
    case "digits":
      return sanitizeDigitsInput(raw, options?.maxLength);
    case "city":
      return sanitizeTextInput(raw, options?.maxLength ?? FIELD_MAX_LENGTH.CITY);
    case "number":
      return sanitizeNumberInput(raw);
    case "phone":
      return sanitizePhoneDigitsInput(raw, options?.maxLength);
    case "text":
    default:
      return sanitizeTextInput(raw, options?.maxLength);
  }
}

/**
 * react-hook-form `register(..., { onChange })` helper.
 * Mutates `e.target.value` so RHF stores the sanitized string.
 */
export function rhfSanitizeOnChange(kind: FieldInputKind, options?: SanitizeFieldOptions) {
  return (e: { target: { value: string } }) => {
    e.target.value = sanitizeFieldInput(kind, e.target.value, options);
  };
}

/** Use with `register(name, rhfRegisterOptions("description"))` and spread `maxLength` onto the input. */
export function rhfRegisterOptions(kind: FieldInputKind, overrideMaxLength?: number) {
  const maxLength = getMaxLengthForFieldKind(kind, overrideMaxLength);
  return {
    onChange: rhfSanitizeOnChange(kind, { maxLength }),
    maxLength,
  } as const;
}
