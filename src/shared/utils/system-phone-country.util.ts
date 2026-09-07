import type { Country } from "react-phone-number-input";
import metadata from "libphonenumber-js/max/metadata";
import { isSupportedCountry } from "libphonenumber-js/core";
import { countryIsoFromIanaTimeZone } from "@/shared/utils/iana-timezone-country";
import { countryIsoToPhoneCountry, DEFAULT_PHONE_COUNTRY_CODE } from "@/shared/utils/phone-input.util";

function asSupportedPhoneCountry(iso: string | null | undefined): Country | undefined {
  const country = countryIsoToPhoneCountry(iso);
  if (!country) return undefined;
  if (!isSupportedCountry(country, metadata)) return undefined;
  return country;
}

function countryFromLanguageTag(tag: string | null | undefined): Country | undefined {
  const raw = (tag ?? "").trim();
  if (!raw) return undefined;
  try {
    const locale = new Intl.Locale(raw);
    return asSupportedPhoneCountry(locale.region);
  } catch {
    const region = raw.split("-")[1]?.toUpperCase();
    return asSupportedPhoneCountry(region);
  }
}

function readDeviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function readDeviceLanguages(): string[] {
  if (typeof navigator === "undefined") return [];
  const languages = navigator.languages?.filter(Boolean);
  if (languages?.length) return [...languages];
  if (navigator.language) return [navigator.language];
  return [];
}

/**
 * Phone flag / calling-code country from the device: OS timezone first
 * (where the user is), then language region (e.g. en-IN).
 */
export function detectSystemPhoneCountry(): Country {
  const fromTz = asSupportedPhoneCountry(countryIsoFromIanaTimeZone(readDeviceTimeZone()));
  if (fromTz) return fromTz;

  for (const tag of readDeviceLanguages()) {
    const fromLang = countryFromLanguageTag(tag);
    if (fromLang) return fromLang;
  }

  return DEFAULT_PHONE_COUNTRY_CODE;
}
