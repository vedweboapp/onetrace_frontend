"use client";

import * as React from "react";
import type { Control, FieldValues, Path, UseFormSetValue } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import {
  applyPlaceSuggestionToForm,
  buildAddressSearchContext,
  type AddressSearchContext,
} from "@/shared/utils/address-place-form.util";

type Options = {
  withCoordinates?: boolean;
};

export function useAddressPlaceForm<T extends FieldValues>(
  control: Control<T>,
  setValue: UseFormSetValue<T>,
  options: Options = {},
): {
  countryIso: string;
  searchContext: AddressSearchContext;
  applyPlace: (place: PlaceSuggestion, line?: "1" | "2" | "reverse") => void;
} {
  const countryIsoRaw = useWatch({ control, name: "country_iso" as Path<T> });
  const stateIsoRaw = useWatch({ control, name: "state_iso" as Path<T> });
  const cityRaw = useWatch({ control, name: "city" as Path<T> });
  const pincodeRaw = useWatch({ control, name: "pincode" as Path<T> });

  const countryIso = typeof countryIsoRaw === "string" ? countryIsoRaw : "";
  const stateIso = typeof stateIsoRaw === "string" ? stateIsoRaw : "";
  const city = typeof cityRaw === "string" ? cityRaw : "";
  const pincode = typeof pincodeRaw === "string" ? pincodeRaw : "";

  const searchContext = React.useMemo(
    () => buildAddressSearchContext({ countryIso, stateIso, city, pincode }),
    [countryIso, stateIso, city, pincode],
  );

  const applyPlace = React.useCallback(
    (place: PlaceSuggestion, line: "1" | "2" | "reverse" = "1") => {
      applyPlaceSuggestionToForm(setValue, place, {
        line,
        withCoordinates: options.withCoordinates,
      });
    },
    [setValue, options.withCoordinates],
  );

  return { countryIso, searchContext, applyPlace };
}
