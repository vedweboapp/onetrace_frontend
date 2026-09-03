"use client";

import * as React from "react";
import PhoneInput from "react-phone-number-input/max";
import type { Country, Value } from "react-phone-number-input";
import { cn } from "@/core/utils/http.util";
import { useSystemPhoneCountry } from "@/shared/hooks/use-system-phone-country";
import { clampPhoneE164ToCountryMax, getInternationalPhoneInputMaxLength } from "@/shared/utils/phone-input.util";
import { SurfacePhoneCountrySelect } from "./surface-phone-country-select";

export type PhoneNumberInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  defaultCountry?: Country;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  numberInputProps?: React.InputHTMLAttributes<HTMLInputElement> & {
    ref?: React.Ref<HTMLInputElement>;
  };
};

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  (ref as React.MutableRefObject<T | null>).current = value;
}

/**
 * Shared phone input: country flag select + E.164 value, clamped to each country's
 * mobile/national max length (e.g. India +91 → 10 digits).
 */
export function PhoneNumberInput({
  value,
  onChange,
  onBlur,
  defaultCountry,
  disabled,
  placeholder,
  className,
  inputRef,
  numberInputProps,
}: PhoneNumberInputProps) {
  const systemCountry = useSystemPhoneCountry();
  const resolvedDefaultCountry = defaultCountry ?? systemCountry;
  const [country, setCountry] = React.useState<Country | undefined>(resolvedDefaultCountry);
  // react-phone-number-input ignores prop updates when the clamped value equals the
  // previous props value (already at max length). Remount after truncate so the UI
  // cannot keep overflowing national digits (e.g. India 13 vs mobile max 10).
  const [clampEpoch, setClampEpoch] = React.useState(0);
  const localInputRef = React.useRef<HTMLInputElement | null>(null);
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const restoreFocusAfterRemount = React.useCallback(() => {
    const el = localInputRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      /* unsupported on some input types */
    }
  }, []);

  // Only adopt a new default flag when the field is empty (address / system country changed).
  React.useEffect(() => {
    if (!valueRef.current.trim()) {
      setCountry(resolvedDefaultCountry);
    }
  }, [resolvedDefaultCountry]);

  React.useLayoutEffect(() => {
    if (clampEpoch === 0) return;
    restoreFocusAfterRemount();
    requestAnimationFrame(restoreFocusAfterRemount);
  }, [clampEpoch, restoreFocusAfterRemount]);

  const activeCountry = country ?? resolvedDefaultCountry;
  const inputMaxLength = getInternationalPhoneInputMaxLength(activeCountry);

  const setInputRefs = React.useCallback(
    (node: HTMLInputElement | null) => {
      localInputRef.current = node;
      assignRef(inputRef, node);
      assignRef(numberInputProps?.ref, node);
    },
    [inputRef, numberInputProps?.ref],
  );

  const handleChange = React.useCallback(
    (next: Value | undefined) => {
      const raw = next ?? "";
      const clamped = clampPhoneE164ToCountryMax(raw, activeCountry);
      valueRef.current = clamped;
      onChange(clamped);
      if (raw !== clamped) {
        setClampEpoch((epoch) => epoch + 1);
      }
    },
    [activeCountry, onChange],
  );

  const handleCountryChange = React.useCallback(
    (next: Country | undefined) => {
      setCountry(next);
      const current = valueRef.current;
      if (!current.trim()) return;
      const clamped = clampPhoneE164ToCountryMax(current, next ?? resolvedDefaultCountry);
      if (clamped === current) return;
      valueRef.current = clamped;
      onChange(clamped);
    },
    [resolvedDefaultCountry, onChange],
  );

  return (
    <PhoneInput
      key={`phone-clamp-${clampEpoch}`}
      value={(value || undefined) as Value | undefined}
      onChange={handleChange}
      onBlur={onBlur}
      onCountryChange={handleCountryChange}
      international
      limitMaxLength
      defaultCountry={resolvedDefaultCountry}
      disabled={disabled}
      placeholder={placeholder}
      countrySelectComponent={SurfacePhoneCountrySelect}
      inputRef={setInputRefs}
      focusInputOnCountrySelection={false}
      className={cn(className)}
      numberInputProps={{
        ...numberInputProps,
        ref: undefined,
        maxLength: inputMaxLength,
      }}
    />
  );
}
