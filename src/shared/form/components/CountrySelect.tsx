"use client";

import React from "react";
import { Country } from "country-state-city";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import {
  FieldErrorText,
  FieldGroup,
  surfaceSelectClassName,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

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
  fieldRequired?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

const cleanLabelNode = (label?: React.ReactNode): React.ReactNode => {
  if (!label) return "";
  if (typeof label === "string") return label.replace(/[*:]/g, "").trim();
  return label;
};

const labelLooksRequired = (label?: React.ReactNode) =>
  typeof label === "string" && /\*/.test(label);

const CountrySelect = ({
  label,
  register,
  errors,
  readOnly,
  className = "",
  placeholder = "Select Country",
  countryCode: _countryCode,
  stateCode: _stateCode,
  defaultValue: _defaultValue,
  fieldRequired,
  required,
  id,
  name,
  ...rest
}: CountrySelectProps) => {
  const countries = Country.getAllCountries();
  const selectId = id ?? register?.name ?? name;
  const isRequired = Boolean(fieldRequired ?? required ?? labelLooksRequired(label));
  const displayLabel = cleanLabelNode(label);

  const control = (
    <select
      id={selectId}
      name={name}
      {...register}
      {...rest}
      disabled={readOnly}
      aria-invalid={errors ? true : undefined}
      className={cn(
        surfaceSelectClassName,
        "field-control",
        readOnly &&
          "cursor-not-allowed border-slate-200 bg-slate-50 select-none focus-visible:border-slate-200 focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-800/50",
        errors && "border-red-500 dark:border-red-500",
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {countries.map((country) => (
        <option key={country.isoCode} value={country.isoCode}>
          {country.name}
        </option>
      ))}
    </select>
  );

  if (!label) {
    return (
      <div className="relative w-full min-w-0 overflow-visible">
        {control}
        <FieldErrorText>{errors?.message}</FieldErrorText>
      </div>
    );
  }

  return (
    <FieldGroup label={displayLabel} htmlFor={selectId} required={isRequired} className="w-full">
      {control}
      <FieldErrorText>{errors?.message}</FieldErrorText>
    </FieldGroup>
  );
};

export default CountrySelect;
