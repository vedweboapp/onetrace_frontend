"use client";

import * as React from "react";
import type { Control, FieldErrors, FieldValues, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Controller } from "react-hook-form";
import { AddressPlaceAutocomplete } from "@/shared/components/maps/address-place-autocomplete";
import { useAddressPlaceForm } from "@/shared/hooks/use-address-place-form";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { cn } from "@/core/utils/http.util";
import { CascadingLocationFields, type CascadingLocationFieldsProps } from "./cascading-location-fields";
import { FieldErrorText, FieldGroup, surfaceInputClassName } from "./field-primitives";
import { FormFieldRow } from "./form-field-grid";

type AddressLabels = {
  addressLine1: React.ReactNode;
  addressLine2: React.ReactNode;
  country: React.ReactNode;
  state: React.ReactNode;
  city: React.ReactNode;
  pincode: React.ReactNode;
};

type AddressErrors = {
  address_line_1?: string;
  address_line_2?: string;
  country_iso?: string;
  state_iso?: string;
  city?: string;
  pincode?: string;
};

export type AddressLineAutocompleteFieldsProps<T extends FieldValues> = {
  idPrefix: string;
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  labels: Pick<AddressLabels, "addressLine1" | "addressLine2">;
  errors?: Pick<AddressErrors, "address_line_1" | "address_line_2">;
  disabled?: boolean;
  withCoordinates?: boolean;
  onPlaceApplied?: (place: PlaceSuggestion, line: "1" | "2") => void;
  /** When true, wraps fields in FormFieldRow. Default true. */
  wrapInRow?: boolean;
  rowCols?: "1" | "2";
};

export function AddressLineAutocompleteFields<T extends FieldValues>({
  idPrefix,
  control,
  setValue,
  labels,
  errors,
  disabled,
  withCoordinates,
  onPlaceApplied,
  wrapInRow = true,
  rowCols = "2",
}: AddressLineAutocompleteFieldsProps<T>) {
  const { countryIso, searchContext, applyPlace: applyPlaceBase } = useAddressPlaceForm(control, setValue, {
    withCoordinates,
  });

  const applyPlace = React.useCallback(
    (place: PlaceSuggestion, line: "1" | "2") => {
      applyPlaceBase(place, line);
      onPlaceApplied?.(place, line);
    },
    [applyPlaceBase, onPlaceApplied],
  );

  const fields = (
    <>
      <Controller
        control={control}
        name={"address_line_1" as never}
        render={({ field }) => (
          <AddressPlaceAutocomplete
            id={`${idPrefix}-line1`}
            label={labels.addressLine1}
            required
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            countryIso={countryIso}
            contextCity={searchContext.city}
            contextState={searchContext.state}
            contextCountry={searchContext.country}
            disabled={disabled}
            invalid={!!errors?.address_line_1}
            error={errors?.address_line_1}
            onSelectPlace={(place) => applyPlace(place, "1")}
          />
        )}
      />
      <Controller
        control={control}
        name={"address_line_2" as never}
        render={({ field }) => (
          <AddressPlaceAutocomplete
            id={`${idPrefix}-line2`}
            label={labels.addressLine2}
            variant="secondary"
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            countryIso={countryIso}
            contextCity={searchContext.city}
            contextState={searchContext.state}
            contextCountry={searchContext.country}
            contextPincode={searchContext.pincode}
            disabled={disabled}
            onSelectPlace={(place) => applyPlace(place, "2")}
          />
        )}
      />
    </>
  );

  if (!wrapInRow) return fields;
  return <FormFieldRow cols={rowCols}>{fields}</FormFieldRow>;
}

export type AddressLocationFieldsProps<T extends FieldValues> = {
  idPrefix: string;
  control: Control<T>;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  labels: Pick<AddressLabels, "country" | "state" | "city" | "pincode">;
  placeholders?: CascadingLocationFieldsProps<T>["placeholders"];
  errors?: Pick<AddressErrors, "country_iso" | "state_iso" | "city" | "pincode">;
  disabled?: boolean;
  className?: string;
};

export function AddressLocationFields<T extends FieldValues>({
  idPrefix,
  control,
  register,
  setValue,
  labels,
  placeholders,
  errors,
  disabled,
  className,
}: AddressLocationFieldsProps<T>) {
  return (
    <CascadingLocationFields<T>
      control={control}
      setValue={setValue}
      countryIsoName={"country_iso" as never}
      stateIsoName={"state_iso" as never}
      cityName={"city" as never}
      rowClassName={className}
      labels={{
        country: labels.country,
        state: labels.state,
        city: labels.city,
      }}
      placeholders={placeholders}
      disabled={disabled}
      errors={{
        country: errors?.country_iso,
        state: errors?.state_iso,
        city: errors?.city,
      }}
      trailingSlot={
        <FieldGroup label={labels.pincode} htmlFor={`${idPrefix}-pincode`} required>
          <input
            id={`${idPrefix}-pincode`}
            autoComplete="postal-code"
            aria-invalid={errors?.pincode ? true : undefined}
            aria-describedby={errors?.pincode ? `${idPrefix}-pincode-err` : undefined}
            className={cn(surfaceInputClassName, errors?.pincode && "border-red-500 dark:border-red-500")}
            disabled={disabled}
            {...register("pincode" as never)}
          />
          <FieldErrorText id={`${idPrefix}-pincode-err`}>{errors?.pincode}</FieldErrorText>
        </FieldGroup>
      }
    />
  );
}

export type AddressFormFieldsProps<T extends FieldValues> = {
  idPrefix: string;
  control: Control<T>;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  labels: AddressLabels;
  placeholders?: CascadingLocationFieldsProps<T>["placeholders"];
  errors?: AddressErrors;
  disabled?: boolean;
  withCoordinates?: boolean;
  /** Address line layout: "stacked" (full width) or "row" (two columns). Default "stacked". */
  addressLineLayout?: "stacked" | "row";
  className?: string;
  locationClassName?: string;
};

export function AddressFormFields<T extends FieldValues>({
  idPrefix,
  control,
  register,
  setValue,
  labels,
  placeholders,
  errors,
  disabled,
  withCoordinates,
  addressLineLayout = "stacked",
  className,
  locationClassName,
}: AddressFormFieldsProps<T>) {
  return (
    <div className={className}>
      <AddressLineAutocompleteFields
        idPrefix={idPrefix}
        control={control}
        setValue={setValue}
        labels={labels}
        errors={errors}
        disabled={disabled}
        withCoordinates={withCoordinates}
        rowCols={addressLineLayout === "stacked" ? "1" : "2"}
      />
      <div className={addressLineLayout === "stacked" ? "mt-4" : undefined}>
        <AddressLocationFields
          idPrefix={idPrefix}
          control={control}
          register={register}
          setValue={setValue}
          labels={labels}
          placeholders={placeholders}
          errors={errors}
          disabled={disabled}
          className={locationClassName}
        />
      </div>
    </div>
  );
}
