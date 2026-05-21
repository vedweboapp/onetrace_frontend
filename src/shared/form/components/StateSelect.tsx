"use client";

import React from "react";
import { State } from "country-state-city";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface StateSelectProps {
  label?: React.ReactNode;
  register?: UseFormRegisterReturn;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
  countryCode?: string;
  placeholder?: string;
  [key: string]: any;
}

const StateSelect = ({
  label,
  register,
  errors,
  readOnly,
  className = "",
  countryCode,
  placeholder = "Select State",
  ...rest
}: StateSelectProps) => {
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
          rounded-[8px] px-3 py-2 outline-none w-full text-slate-900 dark:text-white
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

export default StateSelect;
