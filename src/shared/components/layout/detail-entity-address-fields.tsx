"use client";

import type { EntityAddress, EntityAddressPayload } from "@/shared/types/entity-address.types";
import {
  mapEntityAddressApiToFormRow,
  mapEntityAddressFormRowToPayload,
  normalizePrimaryEntityAddresses,
  type EntityAddressFormRow,
} from "@/shared/form/entity-address-form.util";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailAddressLocationFields } from "@/shared/components/layout/detail-address-location-fields";
import { DetailMetricsGrid } from "@/shared/components/layout/detail-metric-card";

export type DetailEntityAddressFieldLabels = {
  addressLine1: React.ReactNode;
  addressLine2: React.ReactNode;
  pincode: React.ReactNode;
  country: React.ReactNode;
  state: React.ReactNode;
  city: React.ReactNode;
};

type Props = {
  address: EntityAddress;
  labels: DetailEntityAddressFieldLabels;
  editAriaLabel: string;
  line2Empty?: React.ReactNode;
  onSaveAddresses: (addresses: EntityAddressPayload[]) => Promise<void>;
  allAddresses: EntityAddress[];
  addressIndex: number;
};

export function DetailEntityAddressFields({
  address,
  labels,
  editAriaLabel,
  line2Empty = "—",
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
    <DetailMetricsGrid compact>
      <DetailEditableField
        label={labels.addressLine1}
        value={address.address_line_1 ?? ""}
        kind="text"
        editAriaLabel={editAriaLabel}
        onSave={(next) => patchRow((r) => ({ ...r, address_line_1: next }))}
      >
        {address.address_line_1?.trim() ? address.address_line_1 : null}
      </DetailEditableField>
      <DetailEditableField
        label={labels.addressLine2}
        value={address.address_line_2 ?? ""}
        kind="text"
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
