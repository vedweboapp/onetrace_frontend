import type { Country } from "react-phone-number-input";

/** Default calling code for phone fields across the app (+1 United States). */
export const DEFAULT_PHONE_COUNTRY_CODE = "US" as const;

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

/** Map address `country_iso` (e.g. IN) to a phone-input country code. */
export function countryIsoToPhoneCountry(iso: string | null | undefined): Country | undefined {
  const code = (iso ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return undefined;
  return code as Country;
}

type AddressCountryRow = {
  country_iso?: string | null;
  is_primary?: boolean | null;
};

/** Prefer primary address country, else first address that has a country. */
export function resolvePrimaryAddressCountryIso(
  addresses: AddressCountryRow[] | null | undefined,
): string {
  if (!Array.isArray(addresses) || addresses.length === 0) return "";
  const withCountry = (row: AddressCountryRow) => (row.country_iso ?? "").trim().length === 2;
  const primary = addresses.find((row) => row.is_primary && withCountry(row));
  if (primary?.country_iso) return primary.country_iso.trim().toUpperCase();
  const first = addresses.find(withCountry);
  return (first?.country_iso ?? "").trim().toUpperCase();
}

export function resolvePhoneCountryFromAddressIso(
  iso: string | null | undefined,
  fallback: Country = DEFAULT_PHONE_COUNTRY_CODE,
): Country {
  return countryIsoToPhoneCountry(iso) ?? fallback;
}
