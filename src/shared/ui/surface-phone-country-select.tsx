"use client";

import * as React from "react";
import type { Country } from "react-phone-number-input";
import { cn } from "@/core/utils/http.util";
import { CheckmarkSelect, type CheckmarkSelectOption } from "./checkmark-select";

type LibraryCountryOption = {
  value?: string;
  label: string;
  divider?: boolean;
};

type IconComponentProps = {
  country?: Country;
  label: string;
  aspectRatio?: number;
};

export type SurfacePhoneCountrySelectProps = {
  value?: Country;
  options: LibraryCountryOption[];
  onChange: (country?: Country) => void;
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  iconComponent: React.ComponentType<IconComponentProps>;
  name?: string;
  "aria-label"?: string;
};

function toSelectOptions(options: LibraryCountryOption[]): CheckmarkSelectOption[] {
  const out: CheckmarkSelectOption[] = [];
  for (const opt of options) {
    if (opt.divider) continue;
    const v = opt.value === undefined || opt.value === "" ? "ZZ" : opt.value;
    out.push({ value: v, label: opt.label });
  }
  return out;
}

export function SurfacePhoneCountrySelect({
  value,
  options,
  onChange,
  onFocus,
  onBlur,
  disabled,
  readOnly,
  className,
  iconComponent: Icon,
  name,
  "aria-label": ariaLabel,
}: SurfacePhoneCountrySelectProps) {
  const selectOptions = React.useMemo(() => toSelectOptions(options), [options]);

  const selectedRow = React.useMemo(() => {
    const current = value ?? "ZZ";
    for (const opt of options) {
      if (opt.divider) continue;
      const optVal = opt.value === undefined || opt.value === "" ? "ZZ" : opt.value;
      if (optVal === current) return opt;
    }
    return undefined;
  }, [options, value]);

  const selectValue = value ?? "ZZ";
  const iconLabel = selectedRow?.label ?? selectOptions[0]?.label ?? "";

  const effectiveDisabled = Boolean(disabled || readOnly);

  return (
    <div className={cn("PhoneInputCountry flex min-w-0 shrink-0 items-center gap-1.5 self-stretch", className)}>
      <span className="pointer-events-none flex shrink-0 items-center" aria-hidden>
        <Icon country={value} label={iconLabel} />
      </span>
      <CheckmarkSelect
        id={name}
        className="min-w-0 flex-1"
        listLabel={ariaLabel ?? "Country"}
        options={selectOptions}
        value={selectValue}
        emptyLabel={iconLabel}
        disabled={effectiveDisabled}
        portaled
        onChange={(next) => {
          onChange(next === "ZZ" ? undefined : (next as Country));
        }}
        onTriggerFocus={(e) => onFocus?.(e)}
        onTriggerBlur={(e) => onBlur?.(e)}
      />
    </div>
  );
}
