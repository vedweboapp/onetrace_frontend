"use client";

import type { ReactNode } from "react";
import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import { cn } from "@/core/utils/http.util";
import { rhfSanitizeOnChange, type FieldInputKind } from "@/shared/form/field-input.util";
import { getMaxLengthForFieldKind } from "@/shared/form/field-max-length.util";
import { FieldErrorText, FieldGroup, surfaceInputClassName } from "./field-primitives";

export type SurfaceTextareaFieldProps<TFieldValues extends FieldValues> = {
  register: UseFormRegister<TFieldValues>;
  name: Path<TFieldValues>;
  id: string;
  label: ReactNode;
  kind?: Extract<FieldInputKind, "description" | "title" | "text">;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  placeholder?: string;
  rows?: number;
  className?: string;
  textareaClassName?: string;
  maxLength?: number;
};

/** Shared textarea with silent max-length enforcement (descriptions, notes, remarks). */
export function SurfaceTextareaField<TFieldValues extends FieldValues>({
  register,
  name,
  id,
  label,
  kind = "description",
  required,
  disabled,
  error,
  placeholder,
  rows = 4,
  className,
  textareaClassName,
  maxLength,
}: SurfaceTextareaFieldProps<TFieldValues>) {
  const errId = error ? `${id}-error` : undefined;
  const resolvedMaxLength = getMaxLengthForFieldKind(kind, maxLength);
  const registration = register(name, {
    onChange: rhfSanitizeOnChange(kind, { maxLength: resolvedMaxLength }),
  });

  return (
    <FieldGroup label={label} htmlFor={id} required={required} className={className}>
      <textarea
        id={id}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={resolvedMaxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={errId}
        className={cn(surfaceInputClassName, "min-h-[5rem] resize-y", error && "border-red-500 dark:border-red-500", textareaClassName)}
        {...registration}
      />
      <FieldErrorText id={errId}>{error}</FieldErrorText>
    </FieldGroup>
  );
}
