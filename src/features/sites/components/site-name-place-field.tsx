"use client";

import { Controller, useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { SiteFormValues } from "@/features/sites/schemas/site-form-schema";
import { AddressPlaceAutocomplete } from "@/shared/components/maps/address-place-autocomplete";
import { FIELD_MAX_LENGTH } from "@/shared/form/field-max-length.util";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { buildAddressSearchContext } from "@/shared/utils/address-place-form.util";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { FieldGroup } from "@/shared/ui";

type Props = {
  control: Control<SiteFormValues, any, any>;
  setValue: UseFormSetValue<SiteFormValues>;
  error?: string;
  disabled?: boolean;
  onPlaceSelected: (place: PlaceSuggestion) => void;
};

export function SiteNamePlaceField({ control, setValue, error, disabled, onPlaceSelected }: Props) {
  const t = useTranslations("Dashboard.sites");
  const countryIso = useWatch({ control, name: "country_iso" }) ?? "";
  const stateIso = useWatch({ control, name: "state_iso" }) ?? "";
  const city = useWatch({ control, name: "city" }) ?? "";
  const pincode = useWatch({ control, name: "pincode" }) ?? "";
  const searchContext = buildAddressSearchContext({
    countryIso: typeof countryIso === "string" ? countryIso : "",
    stateIso: typeof stateIso === "string" ? stateIso : "",
    city: typeof city === "string" ? city : "",
    pincode: typeof pincode === "string" ? pincode : "",
  });

  return (
    <FieldGroup label={t("fields.siteName")} htmlFor="site-name" required>
      <Controller
        control={control}
        name="site_name"
        render={({ field }) => (
          <AddressPlaceAutocomplete
            id="site-name"
            value={field.value ?? ""}
            selection="placeName"
            portaled
            maxLength={FIELD_MAX_LENGTH.TITLE}
            sanitizeValue={sanitizeTitleInput}
            placeholder={t("location.siteNameSearchPlaceholder")}
            disabled={disabled}
            invalid={!!error}
            error={error}
            countryIso={typeof countryIso === "string" ? countryIso : ""}
            contextCity={typeof city === "string" ? city : ""}
            contextState={searchContext.state}
            contextCountry={searchContext.country}
            contextPincode={typeof pincode === "string" ? pincode : ""}
            onBlur={field.onBlur}
            onChange={(value) => {
              setValue("site_name", sanitizeTitleInput(value), {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }}
            onSelectPlace={onPlaceSelected}
          />
        )}
      />
    </FieldGroup>
  );
}
