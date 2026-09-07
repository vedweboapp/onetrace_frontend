"use client";

import * as React from "react";
import type { ReactNode } from "react";
import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import { cn } from "@/core/utils/http.util";
import {
  rhfSanitizeOnChange,
  type FieldInputKind,
} from "@/shared/form/field-input.util";
import { getMaxLengthForFieldKind } from "@/shared/form/field-max-length.util";
import { FieldErrorText, FieldGroup, surfaceInputClassName } from "./field-primitives";

export type SurfaceTextFieldProps<TFieldValues extends FieldValues> = {
  register: UseFormRegister<TFieldValues>;
  name: Path<TFieldValues>;
  id: string;
  label: ReactNode;
  /** Sanitization kind — `name` blocks digits + capitalizes; `email` lowercases. */
  kind?: Extract<
    FieldInputKind,
    "name" | "companyName" | "abbreviation" | "title" | "email" | "text" | "address" | "city"
  >;
  type?: "text" | "email";
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  maxLength?: number;
};

/**
 * Shared labeled text input with project-wide field sanitization
 * (name / title / email / text). Use instead of one-off capitalize handlers.
 */
export function SurfaceTextField<TFieldValues extends FieldValues>({
  register,
  name,
  id,
  label,
  kind = "text",
  type,
  required,
  disabled,
  error,
  autoComplete,
  placeholder,
  className,
  inputClassName,
  maxLength,
}: SurfaceTextFieldProps<TFieldValues>) {
  const errId = error ? `${id}-error` : undefined;
  const inputType = type ?? (kind === "email" ? "email" : "text");
  const resolvedMaxLength = getMaxLengthForFieldKind(kind, maxLength);
  const registration = register(name, {
    onChange: rhfSanitizeOnChange(kind, { maxLength: resolvedMaxLength }),
  });

  return (
    <FieldGroup label={label} htmlFor={id} required={required} className={className}>
      <input
        id={id}
        type={inputType}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={resolvedMaxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={errId}
        className={cn(surfaceInputClassName, error && "border-red-500 dark:border-red-500", inputClassName)}
        {...registration}
      />
      <FieldErrorText id={errId}>{error}</FieldErrorText>
    </FieldGroup>
  );
}
