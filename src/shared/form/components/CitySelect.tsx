"use client";

import React from "react";
import { City } from "country-state-city";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface CitySelectProps {
  label?: React.ReactNode;
  register?: UseFormRegisterReturn;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
  countryCode?: string;
  stateCode?: string;
  placeholder?: string;
  [key: string]: any;
}

const CitySelect = ({
  label,
  register,
  errors,
  readOnly,
  className = "",
  countryCode,
  stateCode,
  placeholder = "Select City",
  ...rest
}: CitySelectProps) => {
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
          rounded-[8px] px-3 py-2 outline-none w-full text-slate-900 dark:text-white
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

export default CitySelect;
