"use client";

import * as React from "react";
import { AddressPlaceAutocomplete } from "@/shared/components/maps/address-place-autocomplete";
import { buildAddressSearchContext } from "@/shared/utils/address-place-form.util";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import type { EntityAddress, EntityAddressPayload } from "@/shared/types/entity-address.types";
import {
  mapEntityAddressApiToFormRow,
  mapEntityAddressFormRowToPayload,
  normalizePrimaryEntityAddresses,
  type EntityAddressFormRow,
} from "@/shared/form/entity-address-form.util";
import { normalizeEntityAddressType } from "@/shared/types/entity-address.types";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailAddressLocationFields } from "@/shared/components/layout/detail-address-location-fields";
import { DetailMetricsGrid } from "@/shared/components/layout/detail-metric-card";

export type DetailEntityAddressFieldLabels = {
  addressType: React.ReactNode;
  addressLine1: React.ReactNode;
  addressLine2: React.ReactNode;
  pincode: React.ReactNode;
  country: React.ReactNode;
  state: React.ReactNode;
  city: React.ReactNode;
  primary?: React.ReactNode;
};

export type DetailEntityAddressRequiredMessages = {
  addressType?: string;
  addressLine1?: string;
  pincode?: string;
  country?: string;
  state?: string;
  city?: string;
};

type Props = {
  address: EntityAddress;
  labels: DetailEntityAddressFieldLabels;
  addressTypeValue: React.ReactNode;
  addressTypeOptions: CheckmarkSelectOption[];
  editAriaLabel: string;
  line2Empty?: React.ReactNode;
  requiredMessages?: DetailEntityAddressRequiredMessages;
  onSaveAddresses: (addresses: EntityAddressPayload[]) => Promise<void>;
  allAddresses: EntityAddress[];
  addressIndex: number;
};

function DetailAddressLine1Field({
  address,
  label,
  editAriaLabel,
  required,
  requiredMessage,
  onSave,
}: {
  address: EntityAddress;
  label: React.ReactNode;
  editAriaLabel: string;
  required?: boolean;
  requiredMessage?: string;
  onSave: (updater: (row: EntityAddressFormRow) => EntityAddressFormRow) => Promise<void>;
}) {
  const row = React.useMemo(() => mapEntityAddressApiToFormRow(address), [address]);
  const searchContext = React.useMemo(
    () =>
      buildAddressSearchContext({
        countryIso: row.country_iso,
        stateIso: row.state_iso,
        city: row.city,
        pincode: row.pincode,
      }),
    [row.city, row.country_iso, row.pincode, row.state_iso],
  );
  const pickedPlaceRef = React.useRef<PlaceSuggestion | null>(null);

  return (
    <DetailEditableField
      label={label}
      value={address.address_line_1 ?? ""}
      kind="text"
      multiline
      editAriaLabel={editAriaLabel}
      required={required}
      requiredMessage={requiredMessage}
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
          await onSave((r) => ({
            ...r,
            address_line_1: picked.line1,
            address_line_2: picked.line2,
            country_iso: picked.countryIso,
            state_iso: picked.stateIso,
            city: picked.city,
            pincode: picked.pincode,
            latitude: Number.isFinite(picked.lat) ? String(picked.lat) : "",
            longitude: Number.isFinite(picked.lon) ? String(picked.lon) : "",
          }));
          return;
        }
        await onSave((r) => ({ ...r, address_line_1: next }));
      }}
      renderEditor={({ draft, setDraft, saving, editorClassName }) => (
        <AddressPlaceAutocomplete
          id={`detail-address-line1-${address.id ?? addressIndexSafe(address)}`}
          value={draft}
          onChange={(value) => {
            pickedPlaceRef.current = null;
            setDraft(value);
          }}
          countryIso={row.country_iso}
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
      )}
    >
      {address.address_line_1?.trim() ? address.address_line_1 : null}
    </DetailEditableField>
  );
}

function addressIndexSafe(address: EntityAddress): string {
  return typeof address.id === "number" ? String(address.id) : "new";
}

export function DetailEntityAddressFields({
  address,
  labels,
  addressTypeValue,
  addressTypeOptions,
  editAriaLabel,
  line2Empty = "—",
  requiredMessages,
  onSaveAddresses,
  allAddresses,
  addressIndex,
}: Props) {
  async function patchRow(updater: (row: EntityAddressFormRow) => EntityAddressFormRow) {
    const rows = allAddresses.map(mapEntityAddressApiToFormRow);
    const current = rows[addressIndex];
    if (!current) return;
    rows[addressIndex] = updater(current);
    const payloads = normalizePrimaryEntityAddresses(rows).map(mapEntityAddressFormRowToPayload);
    await onSaveAddresses(payloads);
  }

  return (
    <DetailMetricsGrid from="xl" wide>
      <DetailEditableField
        label={labels.addressType}
        value={address.address_type ?? "other"}
        kind="select"
        options={addressTypeOptions}
        editAriaLabel={editAriaLabel}
        required={Boolean(requiredMessages?.addressType)}
        requiredMessage={requiredMessages?.addressType}
        onSave={(next) =>
          patchRow((r) => ({
            ...r,
            address_type: normalizeEntityAddressType(next),
          }))
        }
      >
        {addressTypeValue || "—"}
      </DetailEditableField>
      <DetailAddressLine1Field
        address={address}
        label={labels.addressLine1}
        editAriaLabel={editAriaLabel}
        required={Boolean(requiredMessages?.addressLine1)}
        requiredMessage={requiredMessages?.addressLine1}
        onSave={patchRow}
      />
      <DetailEditableField
        label={labels.addressLine2}
        value={address.address_line_2 ?? ""}
        kind="text"
        multiline
        editAriaLabel={editAriaLabel}
        empty={line2Empty}
        onSave={(next) => patchRow((r) => ({ ...r, address_line_2: next }))}
      >
        {address.address_line_2?.trim() ? address.address_line_2 : null}
      </DetailEditableField>
      <DetailEditableField
        label={labels.pincode}
        value={address.pincode ?? ""}
        kind="text"
        editAriaLabel={editAriaLabel}
        required={Boolean(requiredMessages?.pincode)}
        requiredMessage={requiredMessages?.pincode}
        onSave={(next) => patchRow((r) => ({ ...r, pincode: next }))}
      >
        {address.pincode?.trim() ? address.pincode : null}
      </DetailEditableField>
      <DetailAddressLocationFields
        country={address.country}
        state={address.state}
        city={address.city}
        labels={{
          country: labels.country,
          state: labels.state,
          city: labels.city,
        }}
        editAriaLabel={editAriaLabel}
        requiredMessages={{
          country: requiredMessages?.country,
          state: requiredMessages?.state,
          city: requiredMessages?.city,
        }}
        onSaveCountry={async (countryIso) => {
          await patchRow((r) => ({
            ...r,
            country_iso: countryIso,
            state_iso: "",
            city: "",
          }));
        }}
        onSaveState={async (stateIso) => {
          await patchRow((r) => ({
            ...r,
            state_iso: stateIso,
            city: "",
          }));
        }}
        onSaveCity={async (cityName) => {
          await patchRow((r) => ({ ...r, city: cityName }));
        }}
      />
    </DetailMetricsGrid>
  );
}
