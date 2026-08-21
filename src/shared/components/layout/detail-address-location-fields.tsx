"use client";

import * as React from "react";
import { City, Country, State } from "country-state-city";
import {
  countryIsoFromName,
  countryNameFromIso,
  stateIsoFromName,
  stateNameFromIso,
} from "@/shared/form/entity-address-form.util";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";

export type DetailAddressLocationLabels = {
  country: React.ReactNode;
  state: React.ReactNode;
  city: React.ReactNode;
};

export type DetailAddressLocationRequiredMessages = {
  country?: string;
  state?: string;
  city?: string;
};

type Props = {
  country: string | null | undefined;
  state: string | null | undefined;
  city: string | null | undefined;
  labels: DetailAddressLocationLabels;
  editAriaLabel: string;
  empty?: React.ReactNode;
  /** When set, matching fields show required mark and block empty save. */
  requiredMessages?: DetailAddressLocationRequiredMessages;
  /** Receives ISO code; caller maps to API country name and may clear state/city. */
  onSaveCountry: (countryIso: string) => Promise<void>;
  /** Receives ISO code; caller maps to API state name and may clear city. */
  onSaveState: (stateIso: string) => Promise<void>;
  onSaveCity: (cityName: string) => Promise<void>;
};

export function DetailAddressLocationFields({
  country,
  state,
  city,
  labels,
  editAriaLabel,
  empty = "—",
  requiredMessages,
  onSaveCountry,
  onSaveState,
  onSaveCity,
}: Props) {
  const countryIso = countryIsoFromName(country);
  const stateIso = stateIsoFromName(countryIso, state);
  const countryDisplay = country?.trim() ?? "";
  const stateDisplay = state?.trim() ?? "";
  const cityDisplay = city?.trim() ?? "";

  const countryOptions = React.useMemo(
    () =>
      Country.getAllCountries()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.isoCode, label: c.name })),
    [],
  );

  const stateOptions = React.useMemo(() => {
    if (!countryIso) return [];
    return State.getStatesOfCountry(countryIso)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ value: s.isoCode, label: s.name }));
  }, [countryIso]);

  const cityOptions = React.useMemo(() => {
    if (!countryIso || !stateIso) return [];
    return City.getCitiesOfState(countryIso, stateIso)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: c.name, label: c.name }));
  }, [countryIso, stateIso]);

  const showStateSelect = stateOptions.length > 0;
  const showCitySelect = cityOptions.length > 0;

  const countryRequired = Boolean(requiredMessages?.country);
  const stateRequired = Boolean(requiredMessages?.state) && showStateSelect;
  const cityRequired = Boolean(requiredMessages?.city) && showCitySelect;

  return (
    <>
      <DetailEditableField
        label={labels.country}
        value={countryIso}
        kind="select"
        options={countryOptions}
        selectSearchable
        editAriaLabel={editAriaLabel}
        empty={empty}
        required={countryRequired}
        requiredMessage={requiredMessages?.country}
        onSave={onSaveCountry}
      >
        {countryDisplay || null}
      </DetailEditableField>

      {showStateSelect ? (
        <DetailEditableField
          label={labels.state}
          value={stateIso}
          kind="select"
          options={stateOptions}
          selectSearchable
          editAriaLabel={editAriaLabel}
          empty={empty}
          required={stateRequired}
          requiredMessage={requiredMessages?.state}
          onSave={onSaveState}
        >
          {stateDisplay || null}
        </DetailEditableField>
      ) : (
        <DetailEditableField
          label={labels.state}
          value={stateDisplay}
          kind="text"
          editAriaLabel={editAriaLabel}
          empty={empty}
          onSave={async (next) => onSaveState(next)}
        >
          {stateDisplay || null}
        </DetailEditableField>
      )}

      {showCitySelect ? (
        <DetailEditableField
          label={labels.city}
          value={cityDisplay}
          kind="select"
          options={cityOptions}
          selectSearchable
          editAriaLabel={editAriaLabel}
          empty={empty}
          required={cityRequired}
          requiredMessage={requiredMessages?.city}
          onSave={onSaveCity}
        >
          {cityDisplay || null}
        </DetailEditableField>
      ) : (
        <DetailEditableField
          label={labels.city}
          value={cityDisplay}
          kind="text"
          editAriaLabel={editAriaLabel}
          empty={empty}
          onSave={onSaveCity}
        >
          {cityDisplay || null}
        </DetailEditableField>
      )}
    </>
  );
}

/** Map ISO country code to display name for flat address PATCH payloads. */
export function detailLocationCountryPayload(countryIso: string): string {
  return countryNameFromIso(countryIso);
}

/** Map ISO state code to display name for flat address PATCH payloads. */
export function detailLocationStatePayload(countryIso: string, stateIso: string): string {
  if (!stateIso.trim()) return "";
  const subdivisions = countryIso ? State.getStatesOfCountry(countryIso) : [];
  if (subdivisions.length === 0) return stateIso.trim();
  return stateNameFromIso(countryIso, stateIso);
}
