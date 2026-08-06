import type { MassUpdateFieldDef } from "./types";
import { sanitizeFieldInput } from "@/shared/form/field-input.util";
import {
  FIELD_MAX_LENGTH,
  getMaxLengthForFieldKind,
} from "@/shared/form/field-max-length.util";

/** Max characters for bulk phone updates (E.164-friendly; blocks overly long paste). */
export const MASS_UPDATE_PHONE_MAX_LENGTH = FIELD_MAX_LENGTH.PHONE_DIGITS;

/** Default max digits for pincode / postal code bulk updates. */
export const MASS_UPDATE_PINCODE_MAX_LENGTH = FIELD_MAX_LENGTH.PINCODE;

export function resolveMassUpdateFieldMaxLength(field: MassUpdateFieldDef | null): number | undefined {
  if (!field) return undefined;
  if (field.maxLength != null && field.maxLength > 0) return field.maxLength;
  switch (field.valueType) {
    case "name":
      return getMaxLengthForFieldKind("name");
    case "title":
      return getMaxLengthForFieldKind("title");
    case "email":
      return getMaxLengthForFieldKind("email");
    case "phone":
      return getMaxLengthForFieldKind("phone");
    case "digits":
      return getMaxLengthForFieldKind("digits");
    case "textarea":
      return getMaxLengthForFieldKind("description");
    case "text":
      return getMaxLengthForFieldKind("text");
    default:
      return undefined;
  }
}

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
  const maxLength = resolveMassUpdateFieldMaxLength(field);
  if (field.valueType === "name") return sanitizeFieldInput("name", raw, { maxLength });
  if (field.valueType === "title") return sanitizeFieldInput("title", raw, { maxLength });
  if (field.valueType === "email") return sanitizeFieldInput("email", raw, { maxLength });
  if (field.valueType === "phone") {
    return sanitizeFieldInput("phone", raw, { maxLength });
  }
  if (field.valueType === "digits") {
    return sanitizeFieldInput("digits", raw, { maxLength });
  }
  if (field.valueType === "number") return sanitizeFieldInput("number", raw);
  if (field.valueType === "textarea") {
    return sanitizeFieldInput("description", raw, { maxLength });
  }
  if (field.valueType === "text") {
    return sanitizeFieldInput("text", raw, { maxLength });
  }
  return raw;
}
