"use client";

import React, { SelectHTMLAttributes } from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import {
  FieldErrorText,
  FieldGroup,
  surfaceSelectClassName,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type DropdownOption =
  | string
  | {
      label: string;
      value: string;
    };

type FormDropdownProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: React.ReactNode;
  register?: UseFormRegisterReturn;
  options?: DropdownOption[];
  errors?: FieldError;
  className?: string;
  readOnly?: boolean;
  fieldRequired?: boolean;
};

const formatLabel = (value: string) =>
  value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const labelLooksRequired = (label?: React.ReactNode) =>
  typeof label === "string" && /\*/.test(label);

const cleanLabelNode = (label?: React.ReactNode): React.ReactNode => {
  if (typeof label === "string") return label.replace(/[*:]/g, "").trim();
  return label;
};

const Select = ({
  label,
  register,
  options = [],
  errors,
  className = "",
  readOnly,
  fieldRequired,
  required,
  id,
  name,
  ...rest
}: FormDropdownProps) => {
  const selectId = id ?? register?.name ?? name;
  const isRequired = Boolean(fieldRequired ?? required ?? labelLooksRequired(label));
  const displayLabel = cleanLabelNode(label);

  const control = (
    <select
      id={selectId}
      name={name}
      {...register}
      {...rest}
      required={required}
      disabled={readOnly || rest.disabled}
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
      <option value="">Select...</option>
      {options.map((item, index) => {
        const value = typeof item === "string" ? item : item.value;
        const optionLabel = typeof item === "string" ? formatLabel(item) : item.label;
        return (
          <option key={index} value={value}>
            {optionLabel}
          </option>
        );
      })}
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

export default Select;
