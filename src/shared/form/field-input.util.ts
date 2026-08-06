/**
 * Single entry-point for live input sanitization across forms and mass-update.
 * Prefer {@link sanitizeFieldInput} everywhere instead of ad-hoc per-field logic.
 */

export type FieldInputKind = "name" | "title" | "email" | "text" | "digits" | "number" | "phone";

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

/**
 * Person / company display names: no digits, letters + common punctuation,
 * first letter capitalized. Keeps trailing spaces while typing.
 */
export function sanitizeNameInput(raw: string): string {
  const cleaned = raw
    .replace(/[0-9]/g, "")
    .replace(/[^\p{L}\p{M}\s'.&\-]/gu, "");
  return capitalizeFirstLetter(cleaned);
}

/**
 * Titles / labels that may include numbers (items, projects, statuses).
 * First letter capitalized; strips control chars only.
 */
export function sanitizeTitleInput(raw: string): string {
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, "");
  return capitalizeFirstLetter(cleaned);
}

/** Emails: strip spaces and lowercase while typing. */
export function sanitizeEmailInput(raw: string): string {
  return raw.replace(/\s+/g, "").toLowerCase();
}

/** Plain text: no transform beyond removing control characters. */
export function sanitizeTextInput(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function sanitizeDigitsInput(raw: string, maxLength = 32): string {
  return raw.replace(/\D/g, "").slice(0, maxLength);
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
  return out;
}

/** Phone typing sanitizer for simple text inputs (mass-update). Full UI uses SurfacePhoneField. */
export function sanitizePhoneDigitsInput(raw: string, maxLength = 20): string {
  let out = "";
  for (let i = 0; i < raw.length && out.length < maxLength; i++) {
    const ch = raw[i];
    if (ch === "+" && out.length === 0) {
      out += ch;
      continue;
    }
    if (ch >= "0" && ch <= "9") out += ch;
  }
  return out;
}

/** One function for every field kind — forms, mass-update, and controlled inputs. */
export function sanitizeFieldInput(
  kind: FieldInputKind,
  raw: string,
  options?: SanitizeFieldOptions,
): string {
  switch (kind) {
    case "name":
      return sanitizeNameInput(raw);
    case "title":
      return sanitizeTitleInput(raw);
    case "email":
      return sanitizeEmailInput(raw);
    case "digits":
      return sanitizeDigitsInput(raw, options?.maxLength ?? 32);
    case "number":
      return sanitizeNumberInput(raw);
    case "phone":
      return sanitizePhoneDigitsInput(raw, options?.maxLength ?? 20);
    case "text":
    default:
      return sanitizeTextInput(raw);
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
