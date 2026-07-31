/**
 * Normalize stored/API phone strings into E.164 for react-phone-number-input.
 * Strips spaces, hyphens, and other formatting after the leading +.
 */
export function normalizePhoneForPhoneInput(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";

  const hasPlus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (hasPlus) return `+${digits}`;

  // US-centric fallbacks when no country code prefix is present.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+1${digits.slice(1)}`;

  return `+${digits}`;
}
