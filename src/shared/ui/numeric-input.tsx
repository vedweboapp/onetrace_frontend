"use client";

import * as React from "react";
import { cn } from "@/core/utils/http.util";
import {
  formatGroupedNumber,
  groupedDecimalSeparator,
  parseGroupedNumber,
  sanitizeGroupedNumberDraft,
  toCanonicalNumberString,
} from "@/shared/number/digit-grouping.util";
import { useOrgNumberStore } from "@/shared/number/org-number.store";

type NumericInputProps = {
  id?: string;
  name?: string;
  value?: string | number;
  onChange?: (canonical: string) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  /** Whole numbers only (quantity). */
  integer?: boolean;
  maxDecimals?: number;
  allowNegative?: boolean;
  /** `field` = boxed surface input; `plain` = no chrome (embed in another control). */
  variant?: "field" | "plain";
  size?: "md" | "sm";
};

function canonicalFromValue(value: string | number | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) return toCanonicalNumberString(value);
  return typeof value === "string" ? value : "";
}

/**
 * Number-only input using Company Settings → numberFormat.
 * No spinner arrows, no mouse-wheel / arrow increment.
 */
export function NumericInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  disabled,
  readOnly,
  invalid = false,
  placeholder,
  className,
  autoFocus,
  tabIndex,
  integer = false,
  maxDecimals = 6,
  allowNegative = false,
  variant = "field",
  size = "md",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: NumericInputProps) {
  const numberFormat = useOrgNumberStore((s) => s.numberFormat);
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const canonical = canonicalFromValue(value);
  const decimals = integer ? 0 : maxDecimals;
  const compact = size === "sm";

  const display = React.useMemo(() => {
    if (focused && !readOnly) return draft;
    if (!canonical.trim()) return "";
    const n = parseGroupedNumber(canonical, numberFormat);
    if (!Number.isFinite(n)) return canonical;
    return formatGroupedNumber(n, decimals, numberFormat);
  }, [focused, readOnly, draft, canonical, numberFormat, decimals]);

  function emitFromDraft(next: string) {
    const trimmed = next.trim();
    if (!trimmed || trimmed === "-") {
      onChange?.("");
      return;
    }
    const dec = groupedDecimalSeparator(numberFormat);
    if (!integer && trimmed.endsWith(dec)) {
      const n = parseGroupedNumber(trimmed.slice(0, -1), numberFormat);
      onChange?.(Number.isFinite(n) ? toCanonicalNumberString(n) : "");
      return;
    }
    const n = parseGroupedNumber(next, numberFormat);
    if (Number.isFinite(n)) onChange?.(toCanonicalNumberString(n));
  }

  function blockIncDecKeys(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      return;
    }
    onKeyDown?.(e);
  }

  const input = (
    <input
      id={id}
      name={name}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      autoComplete="off"
      autoFocus={autoFocus}
      tabIndex={tabIndex}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid ?? invalid}
      value={display}
      className={cn(
        "tabular-nums [appearance:textfield]",
        variant === "field" &&
          cn(
            "field-control w-full min-w-0 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm outline-none transition",
            "focus:border-[color:var(--dash-accent,#111111)] focus:ring-2 focus:ring-[color:var(--dash-accent,#111111)]/20",
            "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
            compact ? "h-8 rounded-lg px-2.5 text-sm" : "h-11 px-3.5 text-[length:var(--dash-body-size,0.875rem)]",
            invalid && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            disabled && "cursor-not-allowed opacity-60",
          ),
        className,
      )}
      onFocus={(e) => {
        if (!readOnly) {
          setFocused(true);
          const n = parseGroupedNumber(canonical, numberFormat);
          setDraft(Number.isFinite(n) ? formatGroupedNumber(n, decimals, numberFormat) : canonical);
        }
        onFocus?.(e);
      }}
      onChange={(e) => {
        if (readOnly) return;
        let next = sanitizeGroupedNumberDraft(e.target.value, numberFormat, !integer);
        if (!allowNegative) next = next.replace(/-/g, "");
        setDraft(next);
        emitFromDraft(next);
      }}
      onBlur={(e) => {
        setFocused(false);
        const n = parseGroupedNumber(draft || canonical, numberFormat);
        if (Number.isFinite(n)) onChange?.(toCanonicalNumberString(n));
        onBlur?.(e);
      }}
      onKeyDown={blockIncDecKeys}
      onWheel={(e) => {
        e.currentTarget.blur();
      }}
    />
  );

  return input;
}
