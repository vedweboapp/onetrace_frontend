"use client";

import * as React from "react";
import { City, Country, State } from "country-state-city";
import { useTranslations } from "next-intl";
import type { Control, FieldPath, FieldValues, PathValue, UseFormSetValue } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import { cn } from "@/core/utils/http.util";
import { CheckmarkSelect } from "./checkmark-select";
import { FieldErrorText, FieldGroup, surfaceInputClassName } from "./field-primitives";
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
  /** Pin code field — always rendered beside city in the second row when provided. */
  pincodeName?: FieldPath<TFieldValues>;
  pincodeLabel?: React.ReactNode;
  pincodeRequired?: boolean;
  pincodeDisabled?: boolean;
  pincodeRender?: (props: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    disabled?: boolean;
  }) => React.ReactNode;
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
  pincodeName,
  pincodeLabel,
  pincodeRequired = false,
  pincodeDisabled,
  pincodeRender,
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
  /** City is a select when the dataset lists cities; otherwise a plain text field. */
  const showCitySelect = Boolean(stateIso) && cities.length > 0;
  const showCityText = Boolean(stateIso) && cities.length === 0;

  /** Country chooser always required; state * after a country exists; city * when state is set. */
  const stateRequired = showStateSelect && Boolean(countryIso);
  const cityRequired = showCitySelect || showCityText;

  const readOnlyFieldClassName = cn(
    surfaceInputClassName,
    "pointer-events-none border-0 bg-white text-slate-900 dark:border-0 dark:bg-slate-950 dark:text-slate-100",
    "flex items-center",
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

  const renderPincodeField = () => {
    if (!pincodeName) return null;
    const id = `${String(pincodeName)}-input`;
    return (
      <FieldGroup label={pincodeLabel ?? "Pin code"} htmlFor={id} required={pincodeRequired}>
        {pincodeRender ? (
          <Controller
            control={control}
            name={pincodeName}
            render={({ field }) => (
              <>
                {pincodeRender({
                  id,
                  value: typeof field.value === "string" ? field.value : "",
                  onChange: field.onChange,
                  onBlur: field.onBlur,
                  disabled: pincodeDisabled ?? disabled,
                })}
              </>
            )}
          />
        ) : (
          <Controller
            control={control}
            name={pincodeName}
            render={({ field }) => (
              <input
                id={id}
                autoComplete="postal-code"
                disabled={pincodeDisabled ?? disabled}
                value={typeof field.value === "string" ? field.value : ""}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                className={cn(
                  surfaceInputClassName,
                  (pincodeDisabled ?? disabled) && "bg-slate-50 dark:bg-slate-900/60",
                )}
              />
            )}
          />
        )}
      </FieldGroup>
    );
  };

  const renderCityField = () => {
    if (!showCitySelect && !showCityText) return null;

    if (showCitySelect) {
      return (
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
      );
    }

    return (
      <FieldGroup
        label={labels.city}
        htmlFor={`${String(cityName)}-text`}
        required={cityRequired}
      >
        <Controller
          control={control}
          name={cityName}
          render={({ field }) =>
            disabled ? (
              renderReadOnlyValue(selectedCity, placeholders.city)
            ) : (
              <input
                id={`${String(cityName)}-text`}
                autoComplete="address-level2"
                disabled={disabled || !stateIso}
                value={typeof field.value === "string" ? field.value : ""}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                className={surfaceInputClassName}
              />
            )
          }
        />
        <FieldErrorText>{errors?.city}</FieldErrorText>
      </FieldGroup>
    );
  };

  const cityField = renderCityField();
  const showSecondRow =
    Boolean(cityField) || Boolean(pincodeName) || Boolean(trailingSlot && !showStateSelect);

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

        {showStateSelect ? (
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
        ) : (
          trailingSlot ?? null
        )}
      </FormFieldRow>

      {showSecondRow ? (
        <FormFieldRow cols="2">
          {cityField ?? <div className="hidden min-h-[1px] sm:block" aria-hidden />}
          {pincodeName ? renderPincodeField() : trailingSlot ?? null}
        </FormFieldRow>
      ) : trailingSlot ? (
        <FormFieldRow cols="2">
          <div className="hidden min-h-[1px] sm:block" aria-hidden />
          {trailingSlot}
        </FormFieldRow>
      ) : null}
    </div>
  );
}
