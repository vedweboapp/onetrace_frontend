import { z } from "zod";
import {
  sanitizeCompanyNameInput,
  sanitizeEmailInput,
  sanitizeNameInput,
  sanitizeTitleInput,
} from "./field-input.util";
import { clampFieldLength, FIELD_MAX_LENGTH } from "./field-max-length.util";

/** Trims and requires at least one visible character. */
export function zTrimmedNonEmpty(message = "required") {
  return z.string().trim().min(1, message);
}

/** Name fields: strip digits / invalid symbols, capitalize first letter, require non-empty. */
export function zRequiredName(message = "required") {
  return z
    .string()
    .transform((raw) => clampFieldLength(sanitizeNameInput(raw).trim(), FIELD_MAX_LENGTH.NAME))
    .pipe(z.string().min(1, message));
}

/** Vendor / client / company name — higher length cap. */
export function zRequiredCompanyName(message = "required") {
  return z
    .string()
    .transform((raw) => clampFieldLength(sanitizeCompanyNameInput(raw).trim(), FIELD_MAX_LENGTH.COMPANY_NAME))
    .pipe(z.string().min(1, message));
}

/** Titles that may include numbers; capitalize first letter. */
export function zRequiredTitle(message = "required") {
  return z
    .string()
    .transform((raw) => clampFieldLength(sanitizeTitleInput(raw).trim(), FIELD_MAX_LENGTH.TITLE))
    .pipe(z.string().min(1, message));
}

/** Email: trim, lowercase, validate format. */
export function zEmail(message = "invalidEmail") {
  return z
    .string()
    .transform((raw) => clampFieldLength(sanitizeEmailInput(raw).trim(), FIELD_MAX_LENGTH.EMAIL))
    .pipe(z.string().email(message));
}

/** Leading `#`, expands `#rgb` shorthand, clamps length — then validates 6-digit hex. */
export function zHexColour6(message = "invalidHex") {
  return z
    .string()
    .trim()
    .transform((raw) => {
      const t = raw.trim();
      if (!t) return "";
      const h = t.startsWith("#") ? t : `#${t}`;
      if (h.length === 4 && /^#[0-9a-fA-F]{3}$/i.test(h)) {
        return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
      }
      return h.slice(0, 7).toLowerCase();
    })
    .refine((s) => /^#[0-9a-fA-F]{6}$/.test(s), { message });
}
