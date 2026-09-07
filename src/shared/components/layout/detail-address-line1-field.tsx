"use client";

import * as React from "react";
import { AddressPlaceAutocomplete } from "@/shared/components/maps/address-place-autocomplete";
import { countryIsoFromName, stateIsoFromName } from "@/shared/form/entity-address-form.util";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { buildAddressSearchContext } from "@/shared/utils/address-place-form.util";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
  detailLocationCountryPayload,
  detailLocationStatePayload,
} from "@/shared/components/layout/detail-address-location-fields";

export type FlatAddressPlacePatch = {
  address_line_1: string;
  address_line_2: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
};

export function flatAddressPatchFromPlace(place: PlaceSuggestion): FlatAddressPlacePatch {
  const countryIso = place.countryIso?.trim() ?? "";
  return {
    address_line_1: place.line1,
    address_line_2: place.line2?.trim() ?? "",
    country: detailLocationCountryPayload(countryIso),
    state: detailLocationStatePayload(countryIso, place.stateIso),
    city: place.city?.trim() ?? "",
    pincode: place.pincode?.trim() ?? "",
  };
};

type Props = {
  fieldId: string;
  label: React.ReactNode;
  addressLine1: string | null | undefined;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  editAriaLabel: string;
  required?: boolean;
  requiredMessage?: string;
  empty?: React.ReactNode;
  children?: React.ReactNode;
  onSaveLine: (next: string) => Promise<void>;
  onSavePlace: (place: PlaceSuggestion) => Promise<void>;
};

/** Inline address line 1 with Google / places autocomplete (same as create/edit forms). */
export function DetailAddressLine1EditableField({
  fieldId,
  label,
  addressLine1,
  country,
  state,
  city,
  pincode,
  editAriaLabel,
  required,
  requiredMessage,
  empty,
  children,
  onSaveLine,
  onSavePlace,
}: Props) {
  const countryIso = React.useMemo(() => countryIsoFromName(country), [country]);
  const stateIso = React.useMemo(
    () => stateIsoFromName(countryIso, state),
    [countryIso, state],
  );
  const searchContext = React.useMemo(
    () =>
      buildAddressSearchContext({
        countryIso,
        stateIso,
        city: city ?? "",
        pincode: pincode ?? "",
      }),
    [countryIso, stateIso, city, pincode],
  );
  const pickedPlaceRef = React.useRef<PlaceSuggestion | null>(null);
  const value = addressLine1 ?? "";

  return (
    <DetailEditableField
      label={label}
      value={value}
      kind="text"
      multiline
      editAriaLabel={editAriaLabel}
      required={required}
      requiredMessage={requiredMessage}
      empty={empty}
      onEditStart={() => {
        pickedPlaceRef.current = null;
      }}
      onEditCancel={() => {
        pickedPlaceRef.current = null;
      }}
      onSave={async (next) => {
        const picked = pickedPlaceRef.current;
        pickedPlaceRef.current = null;
        if (picked && picked.line1.trim() === next.trim()) {
          await onSavePlace(picked);
          return;
        }
        await onSaveLine(next);
      }}
      renderEditor={({ draft, setDraft, saving, editorClassName }) => (
        <div
          className="min-w-0 w-full"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <AddressPlaceAutocomplete
            id={`detail-address-line1-${fieldId}`}
            value={draft}
            onChange={(next) => {
              pickedPlaceRef.current = null;
              setDraft(next);
            }}
            countryIso={countryIso}
            contextCity={searchContext.city}
            contextState={searchContext.state}
            contextCountry={searchContext.country}
            contextPincode={searchContext.pincode}
            disabled={saving}
            invalid={false}
            multiline
            portaled
            inputClassName={editorClassName}
            onSelectPlace={(place) => {
              pickedPlaceRef.current = place;
              setDraft(place.line1);
            }}
          />
        </div>
      )}
    >
      {children ?? (value.trim() ? value : null)}
    </DetailEditableField>
  );
}
