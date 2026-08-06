import type { Country } from "react-phone-number-input";
import metadata from "libphonenumber-js/max/metadata";
import {
  getCountryCallingCode,
  isValidPhoneNumber as isValidPhoneNumberWithMeta,
  Metadata,
  parsePhoneNumberFromString,
} from "libphonenumber-js/core";

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
  // Keep a lone "+" so the user can retype a different country calling code.
  if (!digits) return hasPlus ? "+" : "";

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

const nationalLengthCache = new Map<string, number | undefined>();

/**
 * Max national significant digits for a country.
 * Prefers MOBILE lengths (e.g. India = 10) over the broader plan max (IN allows up to 13 for special numbers).
 */
export function getMaxNationalDigitsForCountry(country: Country): number | undefined {
  const key = String(country);
  if (nationalLengthCache.has(key)) return nationalLengthCache.get(key);

  try {
    const meta = new Metadata(metadata);
    if (!meta.hasCountry(country)) {
      nationalLengthCache.set(key, undefined);
      return undefined;
    }
    meta.selectNumberingPlan(country);
    const plan = meta.numberingPlan;
    const mobile = plan?.type("MOBILE")?.possibleLengths?.();
    if (mobile?.length) {
      const max = Math.max(...mobile);
      nationalLengthCache.set(key, max);
      return max;
    }
    const fixed = plan?.type("FIXED_LINE")?.possibleLengths?.();
    if (fixed?.length) {
      const max = Math.max(...fixed);
      nationalLengthCache.set(key, max);
      return max;
    }
    const all = plan?.possibleLengths?.();
    if (all?.length) {
      const max = Math.max(...all);
      nationalLengthCache.set(key, max);
      return max;
    }
  } catch {
    /* unsupported country */
  }
  nationalLengthCache.set(key, undefined);
  return undefined;
}

/**
 * HTML maxLength budget for the international phone text field (includes `+`, calling
 * code, national digits, and AsYouType spacing). Not a hard national-digit guarantee —
 * always pair with {@link clampPhoneE164ToCountryMax}.
 */
export function getInternationalPhoneInputMaxLength(country: Country): number {
  const maxNational = getMaxNationalDigitsForCountry(country) ?? 15;
  let callingCodeLen = 2;
  try {
    callingCodeLen = String(getCountryCallingCode(country, metadata)).length;
  } catch {
    /* unsupported */
  }
  return 1 + callingCodeLen + maxNational + Math.max(2, Math.ceil(maxNational / 3));
}

/**
 * Truncate an in-progress / E.164 phone value so national digits never exceed the country max
 * (India +91 → 10 national digits, etc.).
 *
 * When the typed digits do not start with the selected country's calling code (e.g. user
 * deleted "+1" down to "+" and typed "9" toward "+91"), do not re-inject the old code —
 * treat the input as an in-progress international rewrite.
 */
export function clampPhoneE164ToCountryMax(
  value: string | null | undefined,
  country?: Country | null,
): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw.startsWith("+") ? "+" : "";

  const e164 = `+${digits}`;
  const parsed = parsePhoneNumberFromString(e164, metadata);

  // Prefer country detected from the number. Fall back to the selected flag only when
  // the digits clearly use that country's calling code (avoid "+91" matching US "1").
  let countryCode = (parsed?.country ?? undefined) as Country | undefined;
  if (!countryCode && country) {
    try {
      const selectedCallingCode = String(getCountryCallingCode(country, metadata));
      const parsedCc = parsed?.countryCallingCode
        ? String(parsed.countryCallingCode)
        : undefined;
      const usesSelectedCallingCode =
        digits === selectedCallingCode ||
        (digits.startsWith(selectedCallingCode) &&
          (parsedCc === selectedCallingCode ||
            // Incomplete number still on the selected calling code (e.g. "+1" / "+15…").
            // Require the next digit after a 1-digit CC not extend into another CC that
            // libphonenumber will resolve shortly — until then, only trust exact CC match
            // or an already-parsed matching countryCallingCode.
            selectedCallingCode.length > 1));
      if (usesSelectedCallingCode) {
        countryCode = country;
      }
    } catch {
      /* unsupported country */
    }
  }

  if (!countryCode) {
    return `+${digits.slice(0, 15)}`;
  }

  let callingCode: string;
  try {
    callingCode = String(getCountryCallingCode(countryCode, metadata));
  } catch {
    return `+${digits.slice(0, 15)}`;
  }

  // User is editing the country calling code (e.g. "+" → "+9" → "+91"), not the national number.
  if (!digits.startsWith(callingCode)) {
    return `+${digits.slice(0, 15)}`;
  }

  const maxNational = getMaxNationalDigitsForCountry(countryCode);
  if (maxNational == null) {
    return `+${digits.slice(0, 15)}`;
  }

  const national = digits.slice(callingCode.length);
  if (national.length <= maxNational) {
    return `+${digits}`;
  }

  return `+${callingCode}${national.slice(0, maxNational)}`;
}

/** Shared validator for form schemas (uses full metadata). */
export function isAppValidPhoneNumber(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return false;
  return isValidPhoneNumberWithMeta(raw, metadata);
}
