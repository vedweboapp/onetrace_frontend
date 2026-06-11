"use client";

import React from "react";
import { Country } from "country-state-city";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { surfaceSelectClassName } from "@/shared/ui";

interface CountrySelectProps {
  label?: React.ReactNode;
  register?: UseFormRegisterReturn;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  countryCode?: string;   
  stateCode?: string;     
  defaultValue?: string;  
}

const CountrySelect = ({
  label,
  register,
  errors,
  readOnly,
  className = "",
  placeholder = "Select Country",
  countryCode,
  stateCode,
  defaultValue,
  ...rest
}: CountrySelectProps) => {
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
        disabled={readOnly}
        className={`
          rounded-[8px] px-3 py-2 outline-none w-full text-slate-900 dark:text-white
          ${readOnly
            ? "border-none bg-gray-100 dark:bg-slate-800/50 cursor-not-allowed select-none"
            : `bg-white dark:bg-slate-900 border ${errors ? "border-red-500" : "border-gray-300 dark:border-slate-700"} ${surfaceSelectClassName}`
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

export default CountrySelect;
