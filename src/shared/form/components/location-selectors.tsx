"use client";

import React from "react";
import { Country, State, City } from "country-state-city";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface SelectorProps {
  label: string;
  register: UseFormRegisterReturn;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
  [key: string]: any;
}

export const CountryDropdown = ({
  label = "Country",
  register,
  errors,
  readOnly,
  className = "",
  ...rest
}: SelectorProps) => {
  const countries = Country.getAllCountries();

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label className="text-sm font-medium text-mutedtext">
          {label}
        </label>
      )}

      <select
        {...register}
        {...rest}
        disabled={readOnly}
        className={`
          rounded-[8px] px-3 py-2 outline-none w-full
          ${readOnly
            ? "border-none bg-gray-100 dark:bg-slate-800/50 cursor-not-allowed select-none"
            : `bg-white dark:bg-slate-900 border ${errors ? "border-red-500" : "border-gray-300 dark:border-slate-700"} focus:ring-2 focus:ring-blue-500`
          }
        `}
      >
        <option value="">Select Country</option>
        {countries.map((country) => (
          <option key={country.isoCode} value={country.isoCode}>
            {country.name}
          </option>
        ))}
      </select>

      {errors && <span className="text-red-500 text-xs">{errors.message}</span>}
    </div>
  );
};

export const StateDropdown = ({
  label = "State",
  register,
  errors,
  readOnly,
  className = "",
  countryCode,
  ...rest
}: SelectorProps & { countryCode?: string }) => {
  const states = countryCode ? State.getStatesOfCountry(countryCode) : [];

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label className="text-sm font-medium text-mutedtext">
          {label}
        </label>
      )}

      <select
        {...register}
        {...rest}
        disabled={readOnly || !countryCode}
        className={`
          rounded-[8px] px-3 py-2 outline-none w-full
          ${readOnly || !countryCode
            ? "border-none bg-gray-100 dark:bg-slate-800/50 cursor-not-allowed select-none"
            : `bg-white dark:bg-slate-900 border ${errors ? "border-red-500" : "border-gray-300 dark:border-slate-700"} focus:ring-2 focus:ring-blue-500`
          }
        `}
      >
        <option value="">
          {countryCode ? "Select State" : "Select Country First"}
        </option>
        {states.map((state) => (
          <option key={state.isoCode} value={state.isoCode}>
            {state.name}
          </option>
        ))}
      </select>

      {errors && <span className="text-red-500 text-xs">{errors.message}</span>}
    </div>
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
  ...rest
}: SelectorProps & { countryCode?: string; stateCode?: string }) => {
  const cities =
    countryCode && stateCode
      ? City.getCitiesOfState(countryCode, stateCode)
      : [];

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label className="text-sm font-medium text-mutedtext">
          {label}
        </label>
      )}

      <select
        {...register}
        {...rest}
        disabled={readOnly || !countryCode || !stateCode}
        className={`
          rounded-[8px] px-3 py-2 outline-none w-full
          ${readOnly || !countryCode || !stateCode
            ? "border-none bg-gray-100 dark:bg-slate-800/50 cursor-not-allowed select-none"
            : `bg-white dark:bg-slate-900 border ${errors ? "border-red-500" : "border-gray-300 dark:border-slate-700"} focus:ring-2 focus:ring-blue-500`
          }
        `}
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
      </select>

      {errors && <span className="text-red-500 text-xs">{errors.message}</span>}
    </div>
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
  grid = true,
  fieldNames = { country: "country", state: "state", city: "city" }
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
