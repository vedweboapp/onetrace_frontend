"use client";

import React from "react";
import { State } from "country-state-city";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/core/utils/http.util";
import { surfaceSelectClassName } from "@/shared/ui";

interface StateSelectProps {
  stateCode?: never;
  label?: React.ReactNode;
  register?: UseFormRegisterReturn;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
  countryCode?: string;
  placeholder?: string;
  // Intentionally allow extra props coming from form renderer.
  // Keep it typed to avoid eslint "no-explicit-any" issues.
  [key: string]: unknown;
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
        className={cn(
          surfaceSelectClassName,
          "field-control",
          (readOnly || !countryCode) &&
            "cursor-not-allowed border-slate-200 bg-slate-50 select-none focus-visible:border-slate-200 focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-800/50",
          errors && "border-red-500 dark:border-red-500",
          className,
        )}
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
