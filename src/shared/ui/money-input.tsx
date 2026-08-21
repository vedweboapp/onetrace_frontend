"use client";

import * as React from "react";
import { cn } from "@/core/utils/http.util";
import {
  formatOrgMoneyNumber,
  orgMoneyDecimalSeparator,
  parseOrgMoneyInput,
  sanitizeOrgMoneyDraft,
  toCanonicalMoneyString,
} from "@/shared/money/format-money.util";
import { useOrgCurrency } from "@/shared/money/use-org-currency";

type OrgMoneyPlainInputProps = {
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
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-readonly"?: boolean;
  tabIndex?: number;
};

function canonicalFromValue(value: string | number | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) return toCanonicalMoneyString(value);
  return typeof value === "string" ? value : "";
}

/**
 * Text input that shows Company Settings grouping/decimals while storing a canonical `1234.56` string.
 */
export function OrgMoneyPlainInput({
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
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-readonly": ariaReadonly,
}: OrgMoneyPlainInputProps) {
  const { settings } = useOrgCurrency();
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const canonical = canonicalFromValue(value);

  const display = React.useMemo(() => {
    if (focused && !readOnly) return draft;
    if (!canonical.trim()) return "";
    const n = parseOrgMoneyInput(canonical, settings);
    if (!Number.isFinite(n)) return canonical;
    return formatOrgMoneyNumber(n, settings);
  }, [focused, readOnly, draft, canonical, settings]);

  function emitFromDraft(next: string) {
    const trimmed = next.trim();
    if (!trimmed || trimmed === "-") {
      onChange?.("");
      return;
    }
    const dec = orgMoneyDecimalSeparator(settings);
    if (trimmed.endsWith(dec)) {
      const n = parseOrgMoneyInput(trimmed.slice(0, -1), settings);
      onChange?.(Number.isFinite(n) ? toCanonicalMoneyString(n) : "");
      return;
    }
    const n = parseOrgMoneyInput(next, settings);
    if (Number.isFinite(n)) onChange?.(toCanonicalMoneyString(n));
  }

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      autoFocus={autoFocus}
      tabIndex={tabIndex}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid ?? invalid}
      aria-readonly={ariaReadonly}
      value={display}
      className={cn("tabular-nums", className)}
      onFocus={(e) => {
        if (!readOnly) {
          setFocused(true);
          const n = parseOrgMoneyInput(canonical, settings);
          setDraft(Number.isFinite(n) ? formatOrgMoneyNumber(n, settings) : canonical);
        }
        onFocus?.(e);
      }}
      onChange={(e) => {
        if (readOnly) return;
        const next = sanitizeOrgMoneyDraft(e.target.value, settings);
        setDraft(next);
        emitFromDraft(next);
      }}
      onBlur={(e) => {
        setFocused(false);
        const n = parseOrgMoneyInput(draft || canonical, settings);
        if (Number.isFinite(n)) onChange?.(toCanonicalMoneyString(n));
        onBlur?.(e);
      }}
      onKeyDown={onKeyDown}
    />
  );
}

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className" | "type" | "value" | "onChange" | "size"
> & {
  className?: string;
  inputClassName?: string;
  invalid?: boolean;
  size?: "md" | "sm";
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Ignored — amounts always use a formatted text input. */
  type?: React.HTMLInputTypeAttribute;
  min?: number | string;
  step?: string | number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
};

/**
 * Number input with organization currency symbol/code and digit format
 * (Company Settings → Currencies).
 */
export function MoneyInput({
  className,
  inputClassName,
  invalid = false,
  disabled,
  size = "md",
  value,
  onChange,
  onBlur,
  onFocus,
  id,
  name,
  placeholder,
  readOnly,
  autoFocus,
  tabIndex,
  onKeyDown,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-readonly": ariaReadonly,
}: MoneyInputProps) {
  const { settings, affix } = useOrgCurrency();
  const before = settings.symbolPosition === "before";
  const compact = size === "sm";

  function handleCanonical(next: string) {
    onChange?.({
      target: { value: next, name: name ?? "" },
    } as React.ChangeEvent<HTMLInputElement>);
  }

  return (
    <div
      className={cn(
        "field-control flex w-full min-w-0 items-center rounded-xl border border-slate-200 bg-white text-[length:var(--dash-body-size,0.875rem)] shadow-sm transition",
        compact ? "h-8 rounded-lg" : "h-11",
        "focus-within:border-[color:var(--dash-accent,#111111)] focus-within:ring-2 focus-within:ring-[color:var(--dash-accent,#111111)]/20",
        "dark:border-slate-700 dark:bg-slate-950",
        invalid && "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20",
        disabled && "opacity-60",
        className,
      )}
    >
      {before ? (
        <span
          className={cn(
            "shrink-0 font-medium text-slate-500 dark:text-slate-400",
            compact ? "pl-2.5 text-xs" : "pl-3.5 text-[length:var(--dash-body-size,0.875rem)]",
          )}
          aria-hidden
        >
          {affix}
        </span>
      ) : null}
      <OrgMoneyPlainInput
        id={id}
        name={name}
        value={value}
        onChange={handleCanonical}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        disabled={disabled}
        readOnly={readOnly}
        invalid={invalid}
        placeholder={placeholder}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid === true || ariaInvalid === "true"}
        aria-readonly={ariaReadonly === true || ariaReadonly === "true"}
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent py-0 text-[length:var(--dash-body-size,0.875rem)] text-slate-900 outline-none",
          "placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
          "disabled:cursor-not-allowed",
          compact && "text-sm",
          before ? (compact ? "pr-2.5 pl-1" : "pr-3.5 pl-1.5") : compact ? "pl-2.5 pr-1" : "pl-3.5 pr-1.5",
          inputClassName,
        )}
      />
      {!before ? (
        <span
          className={cn(
            "shrink-0 font-medium text-slate-500 dark:text-slate-400",
            compact ? "pr-2.5 text-xs" : "pr-3.5 text-[length:var(--dash-body-size,0.875rem)]",
          )}
          aria-hidden
        >
          {affix}
        </span>
      ) : null}
    </div>
  );
}
