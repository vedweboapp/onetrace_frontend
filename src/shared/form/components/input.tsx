"use client";

import React, { InputHTMLAttributes } from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import {
  isNativeDateInputType,
  nativeDatePickerHitAreaClassName,
  openNativeDatePicker,
} from "@/shared/ui/surface-date-input";
import {
  FieldErrorText,
  FieldGroup,
  surfaceInputClassName,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  register?: UseFormRegisterReturn;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
  countryCode?: string;
  stateCode?: string;
  /** When true, Appearance required indicator (asterisk / red line) applies. */
  fieldRequired?: boolean;
};

const cleanLabelNode = (label?: React.ReactNode): React.ReactNode => {
  if (!label) return "";
  if (typeof label === "string") return label.replace(/[*:]/g, "").trim();
  return label;
};

const labelLooksRequired = (label?: React.ReactNode) =>
  typeof label === "string" && /\*/.test(label);

const Input = ({
  label,
  register,
  errors,
  readOnly,
  className = "",
  onClick,
  countryCode: _countryCode,
  stateCode: _stateCode,
  fieldRequired,
  required,
  id,
  name,
  ...rest
}: InputProps) => {
  const isDateField = isNativeDateInputType(rest.type);
  const inputId = id ?? register?.name ?? name;
  const cleanLabel = cleanLabelNode(label);
  const isRequired = Boolean(fieldRequired ?? required ?? labelLooksRequired(label));

  function handleDateClick(e: React.MouseEvent<HTMLInputElement>) {
    onClick?.(e);
    if (e.defaultPrevented || readOnly || rest.disabled) return;
    openNativeDatePicker(e.currentTarget);
  }

  const control = (
    <input
      id={inputId}
      name={name}
      {...register}
      {...rest}
      required={required}
      readOnly={readOnly}
      onClick={isDateField ? handleDateClick : onClick}
      placeholder={
        rest.placeholder ||
        (typeof cleanLabel === "string" && cleanLabel ? `Enter ${cleanLabel} here` : rest.placeholder)
      }
      aria-invalid={errors ? true : undefined}
      className={cn(
        surfaceInputClassName,
        "field-control",
        isDateField && !readOnly && nativeDatePickerHitAreaClassName,
        readOnly &&
          "cursor-not-allowed border-slate-200 bg-slate-50 select-none focus-visible:border-slate-200 focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-800/50",
        errors && "border-red-500 dark:border-red-500",
        className,
      )}
    />
  );

  if (!label) {
    return (
      <div className="w-full min-w-0">
        {control}
        <FieldErrorText>{errors?.message}</FieldErrorText>
      </div>
    );
  }

  return (
    <FieldGroup label={cleanLabel} htmlFor={inputId} required={isRequired} className="w-full">
      {control}
      <FieldErrorText>{errors?.message}</FieldErrorText>
    </FieldGroup>
  );
};

export default Input;
