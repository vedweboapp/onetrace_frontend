"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Country, State } from "country-state-city";
import { useTranslations } from "next-intl";
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { SiteFormValues } from "@/features/sites/schemas/site-form-schema";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { applyPlaceSuggestionToForm } from "@/shared/utils/address-place-form.util";
import {
  DetailPageMapLayout,
  detailMapFillClassName,
  detailMapFormGridClassName,
} from "@/shared/components/layout/detail-page-map-layout";
import {
  AddressLineAutocompleteFields,
  AddressLocationFields,
} from "@/shared/ui";

const SiteLocationMapPicker = dynamic(
  () => import("@/shared/components/maps/site-location-map-picker").then((m) => m.SiteLocationMapPicker),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[280px] animate-pulse bg-slate-100 dark:bg-slate-800" />,
  },
);

type Props = {
  control: Control<SiteFormValues, any, any>;
  register: UseFormRegister<SiteFormValues>;
  setValue: UseFormSetValue<SiteFormValues>;
  errors: FieldErrors<SiteFormValues>;
  disabled?: boolean;
  /** Site name, client, etc. — left column above address. */
  leading?: React.ReactNode;
  /** what3words and similar — left column below address, beside the map. */
  afterAddress?: React.ReactNode;
  /** Contact persons — full width below the map row when present. */
  footer?: React.ReactNode;
};

function parseCoordField(raw: string | undefined): number | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function placeToPinnedKey(place: PlaceSuggestion): string {
  return JSON.stringify({
    line1: (place.line1 ?? "").trim(),
    line2: (place.line2 ?? "").trim(),
    city: (place.city ?? "").trim(),
    state: (place.state ?? "").trim(),
    pincode: (place.pincode ?? "").trim(),
    country: (place.country ?? "").trim(),
    countryIso: (place.countryIso ?? "").toUpperCase(),
  });
}

export function SiteLocationFields({
  control,
  register,
  setValue,
  errors,
  disabled,
  leading,
  afterAddress,
  footer,
}: Props) {
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

  const onPlaceApplied = React.useCallback((place: PlaceSuggestion) => {
    setPinnedAddressKey(placeToPinnedKey(place));
  }, []);

  const addressFields = (
    <div className="space-y-6">
      <AddressLineAutocompleteFields
        idPrefix="site"
        control={control as any}
        setValue={setValue}
        withCoordinates
        rowCols="2"
        disabled={disabled}
        onPlaceApplied={onPlaceApplied}
        labels={{
          addressLine1: t("fields.addressLine1"),
          addressLine2: t("fields.addressLine2"),
        }}
        errors={{
          address_line_1: errors.address_line_1?.message,
          address_line_2: errors.address_line_2?.message,
        }}
      />

      <AddressLocationFields
        idPrefix="site"
        control={control as any}
        register={register}
        setValue={setValue}
        disabled={disabled}
        labels={{
          country: t("fields.country"),
          state: t("fields.stateProvince"),
          city: t("fields.city"),
          pincode: t("fields.pincode"),
        }}
        placeholders={{
          country: t("placeholders.country"),
          state: t("placeholders.state"),
          city: t("placeholders.city"),
        }}
        errors={{
          country_iso: errors.country_iso?.message,
          state_iso: errors.state_iso?.message,
          city: errors.city?.message,
          pincode: errors.pincode?.message,
        }}
      />

      <input type="hidden" {...register("latitude")} />
      <input type="hidden" {...register("longitude")} />
    </div>
  );

  const applyPlaceFromMap = React.useCallback(
    (place: PlaceSuggestion) => {
      applyPlaceSuggestionToForm(setValue, place, { line: "reverse", withCoordinates: true });
      setPinnedAddressKey(placeToPinnedKey(place));
    },
    [setValue],
  );

  return (
    <DetailPageMapLayout
      showMap
      mapFillHeight
      gridClassName={detailMapFormGridClassName}
      mapTitle={t("detail.sectionMap")}
      footer={footer}
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
          onReverseGeocoded={applyPlaceFromMap}
        />
      }
    >
      <div className="space-y-6">
        {leading}
        {addressFields}
        {afterAddress}
      </div>
    </DetailPageMapLayout>
  );
}
