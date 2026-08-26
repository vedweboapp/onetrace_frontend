"use client";

import * as React from "react";
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
import { DetailAddressLine1EditableField } from "@/shared/components/layout/detail-address-line1-field";
import { DetailAddressLocationFields } from "@/shared/components/layout/detail-address-location-fields";
import { DetailMetricsGrid } from "@/shared/components/layout/detail-metric-card";
import { cn } from "@/core/utils/http.util";

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
  blockHeading?: React.ReactNode;
  blockPrimaryLabel?: React.ReactNode;
  blockIsPrimary?: boolean;
};

function DetailEntityAddressLine1Field({
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
  return (
    <DetailAddressLine1EditableField
      fieldId={String(address.id ?? "new")}
      label={label}
      addressLine1={address.address_line_1}
      country={address.country}
      state={address.state}
      city={address.city}
      pincode={address.pincode}
      editAriaLabel={editAriaLabel}
      required={required}
      requiredMessage={requiredMessage}
      onSaveLine={(next) => onSave((r) => ({ ...r, address_line_1: next }))}
      onSavePlace={(place) =>
        onSave((r) => ({
          ...r,
          address_line_1: place.line1,
          address_line_2: place.line2,
          country_iso: place.countryIso,
          state_iso: place.stateIso,
          city: place.city,
          pincode: place.pincode,
          latitude: Number.isFinite(place.lat) ? String(place.lat) : "",
          longitude: Number.isFinite(place.lon) ? String(place.lon) : "",
        }))
      }
    >
      {address.address_line_1?.trim() ? address.address_line_1 : null}
    </DetailAddressLine1EditableField>
  );
}

/**
 * One address in a detail section — mailing-style block:
 * header (title + primary + type), then line 1 / line 2 full width,
 * then country / state / city / pincode in a 2-col grid.
 */
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
  blockHeading,
  blockPrimaryLabel,
  blockIsPrimary = false,
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
    <div className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {blockHeading ? (
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{blockHeading}</h4>
          ) : null}
          {blockIsPrimary && blockPrimaryLabel ? (
            <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-slate-100 dark:text-slate-900">
              {blockPrimaryLabel}
            </span>
          ) : null}
        </div>

        <DetailEditableField
          label={labels.addressType}
          value={address.address_type ?? "other"}
          kind="select"
          options={addressTypeOptions}
          editAriaLabel={editAriaLabel}
          required={Boolean(requiredMessages?.addressType)}
          requiredMessage={requiredMessages?.addressType}
          className={cn(
            "w-full min-w-0 sm:w-auto sm:min-w-[11rem] sm:max-w-[14rem]",
            "sm:[&_.field-label]:sr-only",
          )}
          onSave={(next) =>
            patchRow((r) => ({
              ...r,
              address_type: normalizeEntityAddressType(next),
            }))
          }
        >
          {addressTypeValue || "—"}
        </DetailEditableField>
      </div>

      <DetailMetricsGrid columns={1} wide className="!gap-y-0 rounded-lg border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <DetailEntityAddressLine1Field
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
          editAriaLabel={editAriaLabel}
          empty={line2Empty}
          onSave={(next) => patchRow((r) => ({ ...r, address_line_2: next }))}
        >
          {address.address_line_2?.trim() ? address.address_line_2 : null}
        </DetailEditableField>
      </DetailMetricsGrid>

      <DetailMetricsGrid columns={2} wide from="sm" className="!gap-y-0 rounded-lg border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
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
      </DetailMetricsGrid>
    </div>
  );
}
