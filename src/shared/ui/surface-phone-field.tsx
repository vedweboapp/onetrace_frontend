"use client";

import * as React from "react";
import type { ReactNode } from "react";
import type { Control, FieldPath, FieldValues, RegisterOptions } from "react-hook-form";
import { useController } from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import type { Country, Value } from "react-phone-number-input";
import { cn } from "@/core/utils/http.util";
import { normalizePhoneForPhoneInput } from "@/shared/utils/phone-input.util";
import { FieldErrorText, FieldLabel } from "./field-primitives";
import { SurfacePhoneCountrySelect } from "./surface-phone-country-select";

/** Default calling code for phone fields across the app (+1 United States). */
export const DEFAULT_PHONE_COUNTRY: Country = "US";

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
  limitMaxLength?: boolean;
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>;
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
  defaultCountry = DEFAULT_PHONE_COUNTRY,
  placeholder,
  className,
  limitMaxLength = true,
  rules,
}: SurfacePhoneFieldProps<TFieldValues>) {
  const { field } = useController({ control, name, rules });
  const { value, onChange, onBlur, name: fieldName, ref } = field;
  const errId = error ? `${id}-error` : undefined;
  const described = [describedBy, errId].filter(Boolean).join(" ") || undefined;

  const displayValue = React.useMemo(
    () => normalizePhoneForPhoneInput(typeof value === "string" ? value : ""),
    [value],
  );

  React.useEffect(() => {
    const raw = typeof value === "string" ? value : "";
    if (raw && raw !== displayValue) onChange(displayValue);
  }, [displayValue, onChange, value]);

  return (
    <div className={cn("surface-phone-root", className)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <PhoneInput
        value={displayValue as Value}
        onChange={(next) => onChange(next ?? "")}
        onBlur={onBlur}
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
          name: fieldName,
          ref,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": described,
        }}
      />
      <FieldErrorText id={errId}>{error}</FieldErrorText>
    </div>
  );
}
