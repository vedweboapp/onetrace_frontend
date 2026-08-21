"use client";

import * as React from "react";
import type { Country } from "react-phone-number-input";
import { DEFAULT_PHONE_COUNTRY_CODE } from "@/shared/utils/phone-input.util";
import { detectSystemPhoneCountry } from "@/shared/utils/system-phone-country.util";

function subscribe() {
  return () => undefined;
}

/**
 * Default phone country for empty fields, from the device timezone / locale.
 * Server/hydration uses US, then the client value (avoids a hydration mismatch).
 */
export function useSystemPhoneCountry(): Country {
  return React.useSyncExternalStore(subscribe, detectSystemPhoneCountry, () => DEFAULT_PHONE_COUNTRY_CODE);
}
