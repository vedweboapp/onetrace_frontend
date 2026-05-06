"use client";

import type { ReactNode } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import PhoneInput from "react-phone-number-input/react-hook-form";
import type { Country } from "react-phone-number-input";
import { cn } from "@/core/utils/http.util";
import { FieldErrorText, FieldLabel } from "./field-primitives";
import { SurfacePhoneCountrySelect } from "./surface-phone-country-select";

export type SurfacePhoneFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  id: string;
  label: ReactNode;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  describedBy?: string;
  defaultCountry?: Country;
  placeholder?: string;
  className?: string;
  /** When true (default), users cannot type more national digits than allowed for the selected country. */
  limitMaxLength?: boolean;
};

export function SurfacePhoneField<TFieldValues extends FieldValues>({
  control,
  name,
  id,
  label,
  required,
  disabled,
  error,
  describedBy,
  defaultCountry = "IN",
  placeholder,
  className,
  limitMaxLength = true,
}: SurfacePhoneFieldProps<TFieldValues>) {
  const errId = error ? `${id}-error` : undefined;
  const described = [describedBy, errId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("surface-phone-root", className)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <PhoneInput
        control={control}
        name={name}
        international
        limitMaxLength={limitMaxLength}
        defaultCountry={defaultCountry}
        disabled={disabled}
        placeholder={placeholder}
        countrySelectComponent={SurfacePhoneCountrySelect}
        className={cn(
          "mt-1.5",
          error && "ring-2 ring-red-500/30 dark:ring-red-500/25",
        )}
        numberInputProps={{
          id,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": described,
        }}
      />
      <FieldErrorText id={errId}>{error}</FieldErrorText>
    </div>
  );
}
