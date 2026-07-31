"use client";

import * as React from "react";
import { City, Country, State } from "country-state-city";
import { useTranslations } from "next-intl";
import type { Control, FieldPath, FieldValues, PathValue, UseFormSetValue } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import { cn } from "@/core/utils/http.util";
import { CheckmarkSelect } from "./checkmark-select";
import { FieldErrorText, FieldGroup } from "./field-primitives";
import { FormFieldRow } from "./form-field-grid";

export type CascadingLocationFieldsProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  countryIsoName: FieldPath<TFieldValues>;
  stateIsoName: FieldPath<TFieldValues>;
  cityName: FieldPath<TFieldValues>;
  /** Rendered in row 1 when the country has no subdivisions (e.g. pin code). */
  trailingSlot?: React.ReactNode;
  labels: {
    country: React.ReactNode;
    state: React.ReactNode;
    city: React.ReactNode;
  };
  placeholders?: {
    country: string;
    state: string;
    city: string;
  };
  /** When false, hides the country required asterisk (rare). */
  countryRequired?: boolean;
  disabled?: boolean;
  errors?: {
    country?: string;
    state?: string;
    city?: string;
  };
  rowClassName?: string;
};

export function CascadingLocationFields<TFieldValues extends FieldValues>({
  control,
  setValue,
  countryIsoName,
  stateIsoName,
  cityName,
  trailingSlot,
  labels,
  placeholders = {
    country: "—",
    state: "—",
    city: "—",
  },
  countryRequired = true,
  disabled,
  errors,
  rowClassName,
}: CascadingLocationFieldsProps<TFieldValues>) {
  const tList = useTranslations("Dashboard.list");
  const countryIsoRaw = useWatch({ control, name: countryIsoName });
  const stateIsoRaw = useWatch({ control, name: stateIsoName });
  const countryIso = typeof countryIsoRaw === "string" ? countryIsoRaw : "";
  const stateIso = typeof stateIsoRaw === "string" ? stateIsoRaw : "";
  const cityRaw = useWatch({ control, name: cityName });

  const countries = React.useMemo(() => Country.sortByIsoCode(Country.getAllCountries()), []);

  const subdivisions = React.useMemo(() => {
    if (!countryIso) return [];
    return State.getStatesOfCountry(countryIso).sort((a, b) => a.name.localeCompare(b.name));
  }, [countryIso]);

  const cities = React.useMemo(() => {
    if (!countryIso || !stateIso) return [];
    return City.getCitiesOfState(countryIso, stateIso).sort((a, b) => a.name.localeCompare(b.name));
  }, [countryIso, stateIso]);

  const showStateSelect = subdivisions.length > 0;
  /** City is only collected when this state lists cities in the dataset. */
  const showCitySelect = Boolean(stateIso) && cities.length > 0;

  const countryOpts = React.useMemo(
    () => countries.map((c) => ({ value: c.isoCode, label: c.name })),
    [countries],
  );
  const stateOpts = React.useMemo(
    () => subdivisions.map((s) => ({ value: s.isoCode, label: s.name })),
    [subdivisions],
  );
  const cityOpts = React.useMemo(() => cities.map((c) => ({ value: c.name, label: c.name })), [cities]);

  /** Country chooser always required; state * after a country exists; city * only when dataset has cities. */
  const stateRequired = showStateSelect && Boolean(countryIso);
  const cityRequired = showCitySelect;

  const setLocationField = React.useCallback(
    <TName extends FieldPath<TFieldValues>>(
      name: TName,
      value: PathValue<TFieldValues, TName>,
      options?: { validate?: boolean },
    ) => {
      setValue(name, value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: options?.validate ?? true,
      });
    },
    [setValue],
  );

  React.useEffect(() => {
    if (!countryIso) return;
    const subs = State.getStatesOfCountry(countryIso);
    if (subs.length === 0) {
      setLocationField(stateIsoName, "" as PathValue<TFieldValues, typeof stateIsoName>);
      setLocationField(cityName, "" as PathValue<TFieldValues, typeof cityName>);
    }
  }, [countryIso, cityName, stateIsoName, setLocationField]);

  React.useEffect(() => {
    if (!(countryIso && stateIso)) return;
    if (City.getCitiesOfState(countryIso, stateIso).length === 0) {
      setLocationField(cityName, "" as PathValue<TFieldValues, typeof cityName>);
    }
  }, [countryIso, stateIso, cityName, setLocationField]);

  return (
    <div className={cn("space-y-4", rowClassName)}>
      <FormFieldRow cols="2">
        <FieldGroup
          label={labels.country}
          htmlFor={`${String(countryIsoName)}-select`}
          required={countryRequired}
        >
          <Controller
            control={control}
            name={countryIsoName}
            render={({ field }) => (
              <CheckmarkSelect
                id={`${String(countryIsoName)}-select`}
                portaled
                searchable
                searchPlaceholder={tList("searchPlaceholder")}
                listLabel={String(labels.country)}
                options={countryOpts}
                emptyLabel={placeholders.country}
                value={(field.value as string | undefined) ?? ""}
                disabled={disabled}
                invalid={!!errors?.country}
                onBlur={field.onBlur}
                onChange={(next) => {
                  const prev = ((field.value as string | undefined) ?? "") as string;
                  if (next !== prev) {
                    setLocationField(stateIsoName, "" as PathValue<TFieldValues, typeof stateIsoName>);
                    setLocationField(cityName, "" as PathValue<TFieldValues, typeof cityName>);
                  }
                  setLocationField(
                    countryIsoName,
                    next as PathValue<TFieldValues, typeof countryIsoName>,
                  );
                }}
              />
            )}
          />
          <FieldErrorText>{errors?.country}</FieldErrorText>
        </FieldGroup>

        {showStateSelect ? (
          <FieldGroup
            label={labels.state}
            htmlFor={`${String(stateIsoName)}-select`}
            required={stateRequired}
          >
            <Controller
              control={control}
              name={stateIsoName}
              render={({ field }) => (
                <CheckmarkSelect
                  id={`${String(stateIsoName)}-select`}
                  portaled
                  searchable
                  searchPlaceholder={tList("searchPlaceholder")}
                  listLabel={String(labels.state)}
                  options={stateOpts}
                  emptyLabel={placeholders.state}
                  value={(field.value as string | undefined) ?? ""}
                  disabled={disabled || !countryIso}
                  invalid={!!errors?.state}
                  onBlur={field.onBlur}
                  onChange={(next) => {
                    const prev = ((field.value as string | undefined) ?? "") as string;
                    if (next !== prev) {
                      setLocationField(cityName, "" as PathValue<TFieldValues, typeof cityName>);
                    }
                    setLocationField(
                      stateIsoName,
                      next as PathValue<TFieldValues, typeof stateIsoName>,
                    );
                  }}
                />
              )}
            />
            <FieldErrorText>{errors?.state}</FieldErrorText>
          </FieldGroup>
        ) : (
          trailingSlot ?? null
        )}
      </FormFieldRow>

      {showStateSelect && (showCitySelect || trailingSlot) ? (
        <FormFieldRow cols="2" className="mt-4">
          {showCitySelect ? (
            <FieldGroup
              label={labels.city}
              htmlFor={`${String(cityName)}-select`}
              required={cityRequired}
            >
              <Controller
                control={control}
                name={cityName}
                render={({ field }) => (
                  <CheckmarkSelect
                    id={`${String(cityName)}-select`}
                    portaled
                    searchable
                    searchPlaceholder={tList("searchPlaceholder")}
                    listLabel={String(labels.city)}
                    options={cityOpts}
                    emptyLabel={placeholders.city}
                    value={typeof field.value === "string" ? field.value : ""}
                    disabled={disabled || !stateIso}
                    invalid={!!errors?.city}
                    onBlur={field.onBlur}
                    onChange={(v) => {
                      setLocationField(cityName, v as PathValue<TFieldValues, typeof cityName>);
                    }}
                  />
                )}
              />
              <FieldErrorText>{errors?.city}</FieldErrorText>
            </FieldGroup>
          ) : (
            <div className="hidden min-h-[1px] sm:block" aria-hidden />
          )}
          {showCitySelect ? trailingSlot ?? null : <div className="sm:col-span-2">{trailingSlot}</div>}
        </FormFieldRow>
      ) : null}
    </div>
  );
}
