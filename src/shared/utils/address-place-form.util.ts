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
};

export function applyPlaceSuggestionToForm<T extends FieldValues>(
  setValue: UseFormSetValue<T>,
  place: PlaceSuggestion,
  options: ApplyPlaceSuggestionOptions = {},
): void {
  const { line = "1", withCoordinates = false } = options;

  if (line === "1" || line === "reverse") {
    if (place.line1) {
      setValue("address_line_1" as Path<T>, place.line1 as PathValue<T, Path<T>>, { shouldValidate: true });
    }
    if (place.line2) {
      setValue("address_line_2" as Path<T>, place.line2 as PathValue<T, Path<T>>);
    }
    if (place.countryIso) {
      setValue("country_iso" as Path<T>, place.countryIso as PathValue<T, Path<T>>, { shouldValidate: true });
    }
    setValue("state_iso" as Path<T>, place.stateIso as PathValue<T, Path<T>>, { shouldValidate: true });
    setValue("city" as Path<T>, place.city as PathValue<T, Path<T>>, { shouldValidate: true });
    if (place.pincode) {
      setValue("pincode" as Path<T>, place.pincode as PathValue<T, Path<T>>, { shouldValidate: true });
    }
  } else if (place.line2) {
    setValue("address_line_2" as Path<T>, place.line2 as PathValue<T, Path<T>>);
  }

  if (withCoordinates) {
    setValue("latitude" as Path<T>, String(place.lat) as PathValue<T, Path<T>>);
    setValue("longitude" as Path<T>, String(place.lon) as PathValue<T, Path<T>>);
  }
}
