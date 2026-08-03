"use client";

import * as React from "react";
import type { ReactNode } from "react";
import type { Control, FieldPath, FieldValues, RegisterOptions } from "react-hook-form";
import { useController } from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import type { Country, Value } from "react-phone-number-input";
import { cn } from "@/core/utils/http.util";
import {
  countryIsoToPhoneCountry,
  DEFAULT_PHONE_COUNTRY_CODE,
  normalizePhoneForPhoneInput,
} from "@/shared/utils/phone-input.util";
import { FieldErrorText, FieldLabel } from "./field-primitives";
import { SurfacePhoneCountrySelect } from "./surface-phone-country-select";

/** Default calling code for phone fields across the app (+1 United States). */
export const DEFAULT_PHONE_COUNTRY: Country = DEFAULT_PHONE_COUNTRY_CODE;

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
  /**
   * Address / location ISO country (e.g. from primary address). When set, the phone
   * flag defaults to this country (and remounts when it changes while the phone is empty).
   */
  countryIso?: string | null;
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
  countryIso,
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

  const resolvedCountry =
    countryIsoToPhoneCountry(countryIso) ?? defaultCountry;

  React.useEffect(() => {
    const raw = typeof value === "string" ? value : "";
    if (raw && raw !== displayValue) onChange(displayValue);
  }, [displayValue, onChange, value]);

  // Remount when address country changes and the phone is empty so the flag updates.
  const phoneInputKey = displayValue ? `${id}-valued` : `${id}-${resolvedCountry}`;

  return (
    <div className={cn("surface-phone-root", className)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <PhoneInput
        key={phoneInputKey}
        value={displayValue as Value}
        onChange={(next) => onChange(next ?? "")}
        onBlur={onBlur}
        international
        limitMaxLength={limitMaxLength}
        defaultCountry={resolvedCountry}
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
