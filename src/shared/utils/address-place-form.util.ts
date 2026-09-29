import { Country, State } from "country-state-city";
import type { FieldValues, Path, PathValue, UseFormSetValue } from "react-hook-form";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";

export type AddressSearchContext = {
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export function buildAddressSearchContext(input: {
  countryIso: string;
  stateIso: string;
  city: string;
  pincode: string;
}): AddressSearchContext {
  const countryIso = input.countryIso.trim();
  const stateIso = input.stateIso.trim();
  const countryName = Country.getCountryByCode(countryIso)?.name ?? countryIso;
  const stateName =
    countryIso && stateIso
      ? (State.getStatesOfCountry(countryIso).find((s) => s.isoCode === stateIso)?.name ?? stateIso)
      : "";

  return {
    city: input.city.trim(),
    state: stateName,
    country: countryName,
    pincode: input.pincode.trim(),
  };
}

export type ApplyPlaceSuggestionOptions = {
  line?: "1" | "2" | "reverse";
  withCoordinates?: boolean;
  /** Nested row prefix, e.g. `addresses.0`. */
  fieldPrefix?: string;
};

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function applyPlaceSuggestionToForm<T extends FieldValues>(
  setValue: UseFormSetValue<T>,
  place: PlaceSuggestion,
  options: ApplyPlaceSuggestionOptions = {},
): void {
  const { line = "1", withCoordinates = false, fieldPrefix = "" } = options;
  const prefix = fieldPrefix ? `${fieldPrefix}.` : "";

  const set = (name: string, value: string) => {
    setValue(`${prefix}${name}` as Path<T>, value as PathValue<T, Path<T>>, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  // Always overwrite derived fields so a second pick cannot keep the previous
  // place's address line 2, pincode, city, etc. when the new place omits them.
  if (line === "1" || line === "reverse") {
    set("address_line_1", text(place.line1));
    set("address_line_2", text(place.line2));
    set("country_iso", text(place.countryIso));
    set("state_iso", text(place.stateIso));
    set("city", text(place.city));
    set("pincode", text(place.pincode));
  } else {
    set("address_line_2", text(place.line2));
  }

  if (withCoordinates) {
    set("latitude", Number.isFinite(place.lat) ? String(place.lat) : "");
    set("longitude", Number.isFinite(place.lon) ? String(place.lon) : "");
  }
}
