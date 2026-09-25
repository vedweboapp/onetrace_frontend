"use client";

import * as React from "react";
import { City, Country, State } from "country-state-city";
import { useTranslations } from "next-intl";
import type { Control, FieldPath, FieldValues, PathValue, UseFormSetValue } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import { cn } from "@/core/utils/http.util";
import { CheckmarkSelect } from "./checkmark-select";
import { FieldErrorText, FieldGroup, surfaceInputClassName } from "./field-primitives";
import { FormFieldRow, FormFieldSpanFull } from "./form-field-grid";

export type CascadingLocationFieldsProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  countryIsoName: FieldPath<TFieldValues>;
  stateIsoName: FieldPath<TFieldValues>;
  cityName: FieldPath<TFieldValues>;
  /**
   * Optional first cell (e.g. Address line 2) so Country sits beside it —
   * keeps a 2-column grid with no empty half-row.
   */
  leadingSlot?: React.ReactNode;
  /**
   * Last field (e.g. pincode). Paired when there is an open column;
   * otherwise rendered full-width in a single column.
   */
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
  leadingSlot,
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

  const countryOpts = React.useMemo(
    () => countries.map((c) => ({ value: c.isoCode, label: c.name })),
    [countries],
  );
  const stateOpts = React.useMemo(
    () => subdivisions.map((s) => ({ value: s.isoCode, label: s.name })),
    [subdivisions],
  );
  const cityOpts = React.useMemo(
    () => cities.map((c) => ({ value: c.name, label: c.name })),
    [cities],
  );

  const selectedCountry = React.useMemo(
    () => countryOpts.find((option) => option.value === countryIso)?.label ?? "",
    [countryIso, countryOpts],
  );
  const selectedState = React.useMemo(
    () => stateOpts.find((option) => option.value === stateIso)?.label ?? "",
    [stateIso, stateOpts],
  );
  const selectedCity = typeof cityRaw === "string" ? cityRaw : "";

  const showStateSelect = subdivisions.length > 0;
  /** City is only collected when this state lists cities in the dataset. */
  const showCitySelect = Boolean(stateIso) && cities.length > 0;

  /** Country chooser always required; state * after a country exists; city * only when dataset has cities. */
  const stateRequired = showStateSelect && Boolean(countryIso);
  const cityRequired = showCitySelect;

  /** Match disabled/readonly inputs (e.g. pin code) — keep the surface box. */
  const readOnlyFieldClassName = cn(
    surfaceInputClassName,
    "pointer-events-none flex items-center cursor-default select-none",
    "border-slate-200 bg-slate-50 text-slate-900",
    "focus-visible:border-slate-200 focus-visible:ring-0",
    "dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100",
  );

  const renderReadOnlyValue = (value: string, placeholder: string) => (
    <div className={readOnlyFieldClassName} aria-disabled="true">
      {value || placeholder}
    </div>
  );

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

  const countryField = (
    <FieldGroup
      label={labels.country}
      htmlFor={`${String(countryIsoName)}-select`}
      required={countryRequired}
    >
      <Controller
        control={control}
        name={countryIsoName}
        render={({ field }) =>
          disabled ? (
            renderReadOnlyValue(selectedCountry, placeholders.country)
          ) : (
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
          )
        }
      />
      <FieldErrorText>{errors?.country}</FieldErrorText>
    </FieldGroup>
  );

  const stateField = showStateSelect ? (
    <FieldGroup
      label={labels.state}
      htmlFor={`${String(stateIsoName)}-select`}
      required={stateRequired}
    >
      <Controller
        control={control}
        name={stateIsoName}
        render={({ field }) =>
          disabled ? (
            renderReadOnlyValue(selectedState, placeholders.state)
          ) : (
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
          )
        }
      />
      <FieldErrorText>{errors?.state}</FieldErrorText>
    </FieldGroup>
  ) : null;

  const cityField = showCitySelect ? (
    <FieldGroup
      label={labels.city}
      htmlFor={`${String(cityName)}-select`}
      required={cityRequired}
    >
      <Controller
        control={control}
        name={cityName}
        render={({ field }) =>
          disabled ? (
            renderReadOnlyValue(selectedCity, placeholders.city)
          ) : (
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
          )
        }
      />
      <FieldErrorText>{errors?.city}</FieldErrorText>
    </FieldGroup>
  ) : null;

  /**
   * Build ordered cells, then emit 2-col rows. A leftover last cell
   * (typically pincode) spans the full row as a single column.
   */
  const cells: React.ReactNode[] = [];
  if (leadingSlot) cells.push(leadingSlot);
  cells.push(countryField);
  if (stateField) cells.push(stateField);
  if (cityField) cells.push(cityField);
  if (trailingSlot) cells.push(trailingSlot);

  const rows: React.ReactNode[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const left = cells[i];
    const right = cells[i + 1];
    const isLastOdd = right == null && i === cells.length - 1;
    rows.push(
      <FormFieldRow key={`loc-row-${i}`} cols="2" from="md" className={i > 0 ? "mt-4" : undefined}>
        {isLastOdd ? <FormFieldSpanFull>{left}</FormFieldSpanFull> : left}
        {!isLastOdd && right != null ? right : null}
      </FormFieldRow>,
    );
  }

  return <div className={cn(rowClassName)}>{rows}</div>;
}
