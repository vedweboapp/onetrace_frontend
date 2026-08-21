"use client";

import * as React from "react";
import type { ReactNode } from "react";
import type { Control, FieldPath, FieldValues, RegisterOptions } from "react-hook-form";
import { useController } from "react-hook-form";
import type { Country } from "react-phone-number-input";
import { cn } from "@/core/utils/http.util";
import { useSystemPhoneCountry } from "@/shared/hooks/use-system-phone-country";
import {
  clampPhoneE164ToCountryMax,
  countryIsoToPhoneCountry,
  DEFAULT_PHONE_COUNTRY_CODE,
  normalizePhoneForPhoneInput,
} from "@/shared/utils/phone-input.util";
import { FieldErrorText, FieldGroup } from "./field-primitives";
import { PhoneNumberInput } from "./phone-number-input";

/** Last-resort calling-code country when device timezone/locale cannot be detected. */
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
  /** @deprecated Length is always clamped per country; kept for call-site compatibility. */
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
  defaultCountry,
  countryIso,
  placeholder,
  className,
  rules,
}: SurfacePhoneFieldProps<TFieldValues>) {
  const { field } = useController({ control, name, rules });
  const { value, onChange, onBlur, name: fieldName, ref } = field;
  const errId = error ? `${id}-error` : undefined;
  const described = [describedBy, errId].filter(Boolean).join(" ") || undefined;

  const systemCountry = useSystemPhoneCountry();
  const resolvedCountry = countryIsoToPhoneCountry(countryIso) ?? defaultCountry ?? systemCountry;

  const displayValue = React.useMemo(() => {
    const normalized = normalizePhoneForPhoneInput(typeof value === "string" ? value : "");
    return clampPhoneE164ToCountryMax(normalized, resolvedCountry);
  }, [value, resolvedCountry]);

  React.useEffect(() => {
    const raw = typeof value === "string" ? value : "";
    if (raw && raw !== displayValue) onChange(displayValue);
  }, [displayValue, onChange, value]);

  // Remount only when the address-derived default country changes while the phone is empty.
  const phoneMountKeyRef = React.useRef(resolvedCountry);
  const [phoneMountKey, setPhoneMountKey] = React.useState(0);
  React.useEffect(() => {
    if (!displayValue.trim() && phoneMountKeyRef.current !== resolvedCountry) {
      setPhoneMountKey((key) => key + 1);
    }
    phoneMountKeyRef.current = resolvedCountry;
  }, [displayValue, resolvedCountry]);

  return (
    <FieldGroup label={label} htmlFor={id} required={required} className={className}>
      <div className="surface-phone-root">
        <PhoneNumberInput
          key={`${id}-${phoneMountKey}`}
          value={displayValue}
          onChange={onChange}
          onBlur={onBlur}
          defaultCountry={resolvedCountry}
          disabled={disabled}
          placeholder={placeholder}
          inputRef={ref}
          className={cn(error && "ring-2 ring-red-500/30 dark:ring-red-500/25")}
          numberInputProps={{
            id,
            name: fieldName,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": described,
          }}
        />
      </div>
      <FieldErrorText id={errId}>{error}</FieldErrorText>
    </FieldGroup>
  );
}
