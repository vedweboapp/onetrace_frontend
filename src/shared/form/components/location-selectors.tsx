"use client";

import React from "react";
import { Country, State, City } from "country-state-city";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import {
  FieldErrorText,
  FieldGroup,
  surfaceSelectClassName,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

interface SelectorProps {
  label: string;
  register: UseFormRegisterReturn;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
  fieldRequired?: boolean;
  [key: string]: any;
}

function LocationSelect({
  label,
  register,
  errors,
  readOnly,
  className = "",
  fieldRequired,
  disabled,
  children,
  ...rest
}: SelectorProps & { disabled?: boolean; children: React.ReactNode }) {
  const selectId = register?.name;
  return (
    <FieldGroup
      label={label}
      htmlFor={selectId}
      required={fieldRequired}
      className={cn("w-full", className)}
    >
      <select
        id={selectId}
        {...register}
        {...rest}
        disabled={disabled || readOnly}
        aria-invalid={errors ? true : undefined}
        className={cn(
          surfaceSelectClassName,
          "field-control",
          (disabled || readOnly) &&
            "cursor-not-allowed border-slate-200 bg-slate-50 select-none focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-800/50",
          errors && "border-red-500 dark:border-red-500",
        )}
      >
        {children}
      </select>
      <FieldErrorText>{errors?.message}</FieldErrorText>
    </FieldGroup>
  );
}

export const CountryDropdown = ({
  label = "Country",
  register,
  errors,
  readOnly,
  className = "",
  fieldRequired,
  ...rest
}: SelectorProps) => {
  const countries = Country.getAllCountries();

  return (
    <LocationSelect
      label={label}
      register={register}
      errors={errors}
      readOnly={readOnly}
      className={className}
      fieldRequired={fieldRequired}
      {...rest}
    >
      <option value="">Select Country</option>
      {countries.map((country) => (
        <option key={country.isoCode} value={country.isoCode}>
          {country.name}
        </option>
      ))}
    </LocationSelect>
  );
};

export const StateDropdown = ({
  label = "State",
  register,
  errors,
  readOnly,
  className = "",
  countryCode,
  fieldRequired,
  ...rest
}: SelectorProps & { countryCode?: string }) => {
  const states = countryCode ? State.getStatesOfCountry(countryCode) : [];

  return (
    <LocationSelect
      label={label}
      register={register}
      errors={errors}
      readOnly={readOnly}
      className={className}
      fieldRequired={fieldRequired}
      disabled={!countryCode}
      {...rest}
    >
      <option value="">{countryCode ? "Select State" : "Select Country First"}</option>
      {states.map((state) => (
        <option key={state.isoCode} value={state.isoCode}>
          {state.name}
        </option>
      ))}
    </LocationSelect>
  );
};

export const CityDropdown = ({
  label = "City",
  register,
  errors,
  readOnly,
  className = "",
  countryCode,
  stateCode,
  fieldRequired,
  ...rest
}: SelectorProps & { countryCode?: string; stateCode?: string }) => {
  const cities =
    countryCode && stateCode ? City.getCitiesOfState(countryCode, stateCode) : [];

  return (
    <LocationSelect
      label={label}
      register={register}
      errors={errors}
      readOnly={readOnly}
      className={className}
      fieldRequired={fieldRequired}
      disabled={!countryCode || !stateCode}
      {...rest}
    >
      <option value="">
        {!countryCode
          ? "Select Country First"
          : !stateCode
            ? "Select State First"
            : "Select City"}
      </option>
      {cities.map((city) => (
        <option key={city.name} value={city.name}>
          {city.name}
        </option>
      ))}
    </LocationSelect>
  );
};

interface LocationSelectorGroupProps {
  register: any;
  watch: any;
  errors: any;
  readOnly?: boolean;
  grid?: boolean;
  fieldNames?: {
    country?: string;
    state?: string;
    city?: string;
  };
}

export const LocationSelectorGroup = ({
  register,
  watch,
  errors,
  readOnly,
  fieldNames = { country: "country", state: "state", city: "city" },
}: LocationSelectorGroupProps) => {
  const selectedCountry = watch(fieldNames.country || "country");
  const selectedState = watch(fieldNames.state || "state");

  return (
    <>
      <CountryDropdown
        label="Country"
        register={register(fieldNames.country || "country")}
        errors={errors[fieldNames.country || "country"]}
        readOnly={readOnly}
      />
      <StateDropdown
        label="State / Province"
        register={register(fieldNames.state || "state")}
        countryCode={selectedCountry}
        errors={errors[fieldNames.state || "state"]}
        readOnly={readOnly}
      />
      <CityDropdown
        label="City"
        register={register(fieldNames.city || "city")}
        countryCode={selectedCountry}
        stateCode={selectedState}
        errors={errors[fieldNames.city || "city"]}
        readOnly={readOnly}
      />
    </>
  );
};
