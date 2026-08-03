"use client";

import * as React from "react";
import type { Control, FieldPath, FieldValues, PathValue } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { Country } from "react-phone-number-input";
import {
  resolvePhoneCountryFromAddressIso,
  resolvePrimaryAddressCountryIso,
} from "@/shared/utils/phone-input.util";

/** Phone flag country from a multi-address form field (`addresses[].country_iso`). */
export function usePhoneCountryFromAddresses<TFieldValues extends FieldValues>(
  control: Control<TFieldValues>,
  addressesName: FieldPath<TFieldValues> = "addresses" as FieldPath<TFieldValues>,
): Country {
  const addresses = useWatch({
    control,
    name: addressesName,
  }) as PathValue<TFieldValues, typeof addressesName> | undefined;

  return React.useMemo(
    () =>
      resolvePhoneCountryFromAddressIso(
        resolvePrimaryAddressCountryIso(
          Array.isArray(addresses) ? (addresses as Array<{ country_iso?: string | null; is_primary?: boolean | null }>) : [],
        ),
      ),
    [addresses],
  );
}

/** Phone flag country from a single `country_iso` form field. */
export function usePhoneCountryFromCountryIso<TFieldValues extends FieldValues>(
  control: Control<TFieldValues>,
  countryIsoName: FieldPath<TFieldValues> = "country_iso" as FieldPath<TFieldValues>,
): Country {
  const countryIso = useWatch({ control, name: countryIsoName });

  return React.useMemo(
    () => resolvePhoneCountryFromAddressIso(typeof countryIso === "string" ? countryIso : ""),
    [countryIso],
  );
}
