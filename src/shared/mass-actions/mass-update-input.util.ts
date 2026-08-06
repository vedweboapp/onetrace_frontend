import type { MassUpdateFieldDef } from "./types";
import { sanitizeFieldInput } from "@/shared/form/field-input.util";

/** Max characters for bulk phone updates (E.164-friendly; blocks overly long paste). */
export const MASS_UPDATE_PHONE_MAX_LENGTH = 20;

/** Default max digits for pincode / postal code bulk updates. */
export const MASS_UPDATE_PINCODE_MAX_LENGTH = 12;

export function sanitizeMassUpdatePhoneInput(raw: string): string {
  return sanitizeFieldInput("phone", raw, { maxLength: MASS_UPDATE_PHONE_MAX_LENGTH });
}

export function sanitizeMassUpdateNumberInput(raw: string): string {
  return sanitizeFieldInput("number", raw);
}

export function sanitizeMassUpdateDigitsInput(raw: string, maxLength: number): string {
  return sanitizeFieldInput("digits", raw, { maxLength });
}

export function sanitizeMassUpdateFieldInput(field: MassUpdateFieldDef | null, raw: string): string {
  if (!field) return raw;
  if (field.valueType === "name") return sanitizeFieldInput("name", raw);
  if (field.valueType === "title") return sanitizeFieldInput("title", raw);
  if (field.valueType === "email") return sanitizeFieldInput("email", raw);
  if (field.valueType === "phone") {
    return sanitizeFieldInput("phone", raw, {
      maxLength: field.maxLength ?? MASS_UPDATE_PHONE_MAX_LENGTH,
    });
  }
  if (field.valueType === "digits") {
    return sanitizeFieldInput("digits", raw, {
      maxLength: field.maxLength ?? MASS_UPDATE_PINCODE_MAX_LENGTH,
    });
  }
  if (field.valueType === "number") return sanitizeFieldInput("number", raw);
  if (field.valueType === "textarea" || field.valueType === "text") {
    return sanitizeFieldInput("text", raw);
  }
  return raw;
}
