/** Project-wide input length caps — enforced silently (no validation hints). */
export const FIELD_MAX_LENGTH = {
  /** Person / contact name */
  NAME: 100,
  /** Vendor, client, company name */
  COMPANY_NAME: 150,
  /** Abbreviation / short code */
  ABBREVIATION: 20,
  /** Address line 1 & 2 */
  ADDRESS_LINE: 250,
  /** E.164 digit budget (+ country code + national number) */
  PHONE_DIGITS: 20,
  EMAIL: 254,
  /** Short note / title / label */
  TITLE: 250,
  /** Long description / remarks / notes */
  DESCRIPTION: 2000,
  PINCODE: 12,
  CITY: 100,
  GENERIC_TEXT: 250,
} as const;

export function clampFieldLength(value: string, maxLength: number): string {
  if (maxLength <= 0 || value.length <= maxLength) return value;
  return value.slice(0, maxLength);
}

export type FieldLengthKind =
  | "name"
  | "companyName"
  | "abbreviation"
  | "title"
  | "email"
  | "text"
  | "address"
  | "description"
  | "phone"
  | "digits"
  | "number"
  | "city"
  | "pincode";

export function getMaxLengthForFieldKind(
  kind: FieldLengthKind,
  override?: number,
): number {
  if (override != null && override > 0) return override;
  switch (kind) {
    case "name":
      return FIELD_MAX_LENGTH.NAME;
    case "companyName":
      return FIELD_MAX_LENGTH.COMPANY_NAME;
    case "abbreviation":
      return FIELD_MAX_LENGTH.ABBREVIATION;
    case "title":
      return FIELD_MAX_LENGTH.TITLE;
    case "email":
      return FIELD_MAX_LENGTH.EMAIL;
    case "address":
      return FIELD_MAX_LENGTH.ADDRESS_LINE;
    case "description":
      return FIELD_MAX_LENGTH.DESCRIPTION;
    case "phone":
      return FIELD_MAX_LENGTH.PHONE_DIGITS;
    case "digits":
      return FIELD_MAX_LENGTH.PINCODE;
    case "city":
      return FIELD_MAX_LENGTH.CITY;
    case "number":
      return FIELD_MAX_LENGTH.GENERIC_TEXT;
    case "text":
    default:
      return FIELD_MAX_LENGTH.GENERIC_TEXT;
  }
}

/** react-hook-form onChange helper for inputs / textareas without a dedicated kind. */
export function rhfClampMaxLength(maxLength: number) {
  return (e: { target: { value: string } }) => {
    e.target.value = clampFieldLength(e.target.value, maxLength);
  };
}
