"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Country, State } from "country-state-city";
import { useTranslations } from "next-intl";
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import type { SiteFormValues } from "@/features/sites/schemas/site-form-schema";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { AddressPlaceAutocomplete } from "@/shared/components/maps/address-place-autocomplete";
import {
  DetailPageMapLayout,
  detailMapFillClassName,
} from "@/shared/components/layout/detail-page-map-layout";
import {
  CascadingLocationFields,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  surfaceInputClassName,
} from "@/shared/ui";

const SiteLocationMapPicker = dynamic(
  () => import("@/shared/components/maps/site-location-map-picker").then((m) => m.SiteLocationMapPicker),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[280px] animate-pulse bg-slate-100 dark:bg-slate-800" />,
  },
);

type Props = {
  control: Control<SiteFormValues>;
  register: UseFormRegister<SiteFormValues>;
  setValue: UseFormSetValue<SiteFormValues>;
  errors: FieldErrors<SiteFormValues>;
  disabled?: boolean;
};

function parseCoordField(raw: string | undefined): number | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function SiteLocationFields({ control, register, setValue, errors, disabled }: Props) {
  const t = useTranslations("Dashboard.sites");

  const countryIso = useWatch({ control, name: "country_iso" }) ?? "";
  const stateIso = useWatch({ control, name: "state_iso" }) ?? "";
  const line1 = useWatch({ control, name: "address_line_1" }) ?? "";
  const line2 = useWatch({ control, name: "address_line_2" }) ?? "";
  const city = useWatch({ control, name: "city" }) ?? "";
  const pincode = useWatch({ control, name: "pincode" }) ?? "";
  const latitudeRaw = useWatch({ control, name: "latitude" }) ?? "";
  const longitudeRaw = useWatch({ control, name: "longitude" }) ?? "";

  const countryName = React.useMemo(() => {
    const iso = typeof countryIso === "string" ? countryIso : "";
    return Country.getCountryByCode(iso)?.name ?? iso;
  }, [countryIso]);

  const stateName = React.useMemo(() => {
    const iso = typeof countryIso === "string" ? countryIso : "";
    const st = typeof stateIso === "string" ? stateIso : "";
    if (!iso || !st) return "";
    return State.getStatesOfCountry(iso).find((s) => s.isoCode === st)?.name ?? st;
  }, [countryIso, stateIso]);

  const searchContext = React.useMemo(
    () => ({
      city: typeof city === "string" ? city : "",
      state: stateName,
      country: countryName,
      pincode: typeof pincode === "string" ? pincode : "",
    }),
    [city, stateName, countryName, pincode],
  );

  const applyPlace = React.useCallback(
    (place: PlaceSuggestion, line: "1" | "2" | "reverse") => {
      if (line === "1" || line === "reverse") {
        if (place.line1) setValue("address_line_1", place.line1, { shouldValidate: true });
        if (place.line2) setValue("address_line_2", place.line2);
        if (place.countryIso) setValue("country_iso", place.countryIso, { shouldValidate: true });
        setValue("state_iso", place.stateIso, { shouldValidate: true });
        setValue("city", place.city, { shouldValidate: true });
        if (place.pincode) setValue("pincode", place.pincode, { shouldValidate: true });
      } else if (place.line2) {
        setValue("address_line_2", place.line2);
      }
      setValue("latitude", String(place.lat));
      setValue("longitude", String(place.lon));
      setPinnedAddressKey(
        JSON.stringify({
          line1: (place.line1 ?? "").trim(),
          line2: (place.line2 ?? "").trim(),
          city: (place.city ?? "").trim(),
          state: (place.state ?? "").trim(),
          pincode: (place.pincode ?? "").trim(),
          country: (place.country ?? "").trim(),
          countryIso: (place.countryIso ?? "").toUpperCase(),
        }),
      );
    },
    [setValue],
  );

  const lat = parseCoordField(latitudeRaw);
  const lon = parseCoordField(longitudeRaw);

  const addressSnapshotKey = React.useMemo(
    () =>
      JSON.stringify({
        line1: typeof line1 === "string" ? line1.trim() : "",
        line2: typeof line2 === "string" ? line2.trim() : "",
        city: typeof city === "string" ? city.trim() : "",
        state: stateName.trim(),
        pincode: typeof pincode === "string" ? pincode.trim() : "",
        country: countryName.trim(),
        countryIso: typeof countryIso === "string" ? countryIso.toUpperCase() : "",
      }),
    [line1, line2, city, stateName, pincode, countryName, countryIso],
  );

  const [pinnedAddressKey, setPinnedAddressKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (pinnedAddressKey && pinnedAddressKey !== addressSnapshotKey) {
      setPinnedAddressKey(null);
    }
  }, [addressSnapshotKey, pinnedAddressKey]);

  const addressFields = (
    <div className="space-y-6">
      <FormFieldRow cols="2">
        <Controller
          control={control}
          name="address_line_1"
          render={({ field }) => (
            <AddressPlaceAutocomplete
              id="site-line1"
              label={t("fields.addressLine1")}
              required
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              countryIso={typeof countryIso === "string" ? countryIso : ""}
              contextCity={searchContext.city}
              contextState={searchContext.state}
              contextCountry={searchContext.country}
              disabled={disabled}
              invalid={!!errors.address_line_1}
              error={errors.address_line_1?.message}
              onSelectPlace={(place) => applyPlace(place, "1")}
            />
          )}
        />
        <Controller
          control={control}
          name="address_line_2"
          render={({ field }) => (
            <AddressPlaceAutocomplete
              id="site-line2"
              label={t("fields.addressLine2")}
              variant="secondary"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              countryIso={typeof countryIso === "string" ? countryIso : ""}
              contextCity={searchContext.city}
              contextState={searchContext.state}
              contextCountry={searchContext.country}
              contextPincode={searchContext.pincode}
              disabled={disabled}
              onSelectPlace={(place) => applyPlace(place, "2")}
            />
          )}
        />
      </FormFieldRow>

      <CascadingLocationFields<SiteFormValues>
        control={control}
        setValue={setValue}
        countryIsoName="country_iso"
        stateIsoName="state_iso"
        cityName="city"
        labels={{
          country: t("fields.country"),
          state: t("fields.stateProvince"),
          city: t("fields.city"),
        }}
        placeholders={{
          country: t("placeholders.country"),
          state: t("placeholders.state"),
          city: t("placeholders.city"),
        }}
        disabled={disabled}
        errors={{
          country: errors.country_iso?.message,
          state: errors.state_iso?.message,
          city: errors.city?.message,
        }}
        trailingSlot={
          <FieldGroup label={t("fields.pincode")} htmlFor="site-pincode" required>
            <input
              id="site-pincode"
              aria-invalid={errors.pincode ? true : undefined}
              className={surfaceInputClassName}
              disabled={disabled}
              {...register("pincode")}
            />
            <FieldErrorText>{errors.pincode?.message}</FieldErrorText>
          </FieldGroup>
        }
      />

      <input type="hidden" {...register("latitude")} />
      <input type="hidden" {...register("longitude")} />
    </div>
  );

  return (
    <DetailPageMapLayout
      showMap
      mapTitle={t("detail.sectionMap")}
      map={
        <SiteLocationMapPicker
          embedded
          className={detailMapFillClassName}
          pinnedAddressKey={pinnedAddressKey}
          latitude={lat}
          longitude={lon}
          addressParts={{
            line1,
            line2,
            city,
            state: stateName,
            pincode,
            country: countryName,
            countryIso: typeof countryIso === "string" ? countryIso : "",
          }}
          disabled={disabled}
          onCoordinatesChange={(nextLat, nextLon) => {
            setValue("latitude", String(nextLat));
            setValue("longitude", String(nextLon));
          }}
          onReverseGeocoded={(place) => applyPlace(place, "reverse")}
        />
      }
    >
      {addressFields}
    </DetailPageMapLayout>
  );
}
