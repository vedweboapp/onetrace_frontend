"use client";

import React from "react";
import { City } from "country-state-city";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/core/utils/http.util";
import { surfaceSelectClassName } from "@/shared/ui";

interface CitySelectProps {
  label?: React.ReactNode;
  register?: UseFormRegisterReturn;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
  countryCode?: string;
  stateCode?: string;
  placeholder?: string;
  [key: string]: unknown;
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
  // Prevent camelCase props like `countryCode`/`stateCode` leaking to the DOM
  // (React warns when unknown props are spread onto native elements).
  countryCode: _countryCode,
  stateCode: _stateCode,
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
        className={cn(
          surfaceSelectClassName,
          "field-control",
          (readOnly || !countryCode || !stateCode) &&
            "cursor-not-allowed border-slate-200 bg-slate-50 select-none focus-visible:border-slate-200 focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-800/50",
          errors && "border-red-500 dark:border-red-500",
          className,
        )}
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
