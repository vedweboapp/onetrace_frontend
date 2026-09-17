"use client";

import React from "react";
import { FieldError } from "react-hook-form";
import { currencyList } from "./currency-list";
import { surfaceInputClassName, surfaceSelectClassName } from "@/shared/ui";

export type CurrencyFieldValue = {
  amount: string;
  currency: string;
};

export function getFieldCurrencyDefault(field: Record<string, unknown> | undefined): string {
  if (!field) return "";
  const validationRules =
    (field.properties as { validation_rules?: Record<string, unknown> } | undefined)?.validation_rules ??
    (field.validation_rules as Record<string, unknown> | undefined);
  const dv =
    field.defaultValue ??
    field.default_value ??
    validationRules?.default_value ??
    validationRules?.defaultValue;

  if (typeof dv === "string") return dv.trim();
  if (dv && typeof dv === "object" && !Array.isArray(dv) && "currency" in dv) {
    return String((dv as { currency?: unknown }).currency ?? "").trim();
  }
  return "";
}

function normalizeValue(
  value: CurrencyFieldValue | string | null | undefined,
  defaultCurrency = "",
): CurrencyFieldValue {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const normalized = {
      amount: value.amount != null ? String(value.amount) : "",
      currency: value.currency != null ? String(value.currency) : "",
    };
    if (!normalized.currency && defaultCurrency) {
      normalized.currency = defaultCurrency;
    }
    return normalized;
  }
  if (typeof value === "string" && value.trim()) {
    return { amount: "", currency: value.trim() };
  }
  return { amount: "", currency: defaultCurrency };
}

type CurrencyFieldProps = {
  label?: React.ReactNode;
  name?: string;
  value?: CurrencyFieldValue | string;
  onChange?: (value: CurrencyFieldValue) => void;
  errors?: FieldError;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  defaultCurrency?: string;
};

export function CurrencyField({
  label,
  name,
  value,
  onChange,
  errors,
  readOnly = false,
  placeholder = "0.00",
  className = "",
  defaultCurrency = "",
}: CurrencyFieldProps) {
  const current = normalizeValue(value, defaultCurrency);
  const currencyLabel =
    currencyList.find((c) => c.value === current.currency)?.label ?? current.currency;

  if (readOnly) {
    const display =
      current.amount && current.currency
        ? `${current.amount} ${current.currency}`
        : current.amount || currencyLabel || current.currency || "—";

    return (
      <div className={`flex flex-col gap-1 w-full ${className}`}>
        {label ? <span className="text-sm font-medium text-mutedtext">{label}</span> : null}
        <p className="rounded-[8px] bg-gray-100 px-3 py-2 text-sm text-slate-900 dark:bg-slate-800/50 dark:text-slate-100">
          {display}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label ? (
        typeof label === "string" ? (
          <label
            htmlFor={name ? `${name}-currency` : undefined}
            className="text-sm font-medium text-mutedtext"
          >
            {label}
          </label>
        ) : (
          label
        )
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        <select
          id={name ? `${name}-currency` : undefined}
          name={name ? `${name}-currency` : undefined}
          value={current.currency}
          onChange={(e) => onChange?.({ ...current, currency: e.target.value })}
          className={`rounded-[8px] px-3 py-2 outline-none w-full text-slate-900 dark:text-white bg-white dark:bg-slate-900 border ${
            errors ? "border-red-500" : "border-gray-300 dark:border-slate-700"
          } ${surfaceSelectClassName}`}
        >
          <option value="">Select currency</option>
          {currencyList.map((currency) => (
            <option key={`${currency.countryCode}-${currency.value}`} value={currency.value}>
              {currency.label} ({currency.symbol})
            </option>
          ))}
        </select>
        <input
          id={name ? `${name}-amount` : undefined}
          name={name ? `${name}-amount` : undefined}
          type="text"
          inputMode="decimal"
          value={current.amount}
          placeholder={placeholder}
          onChange={(e) => onChange?.({ ...current, amount: e.target.value })}
          className={`rounded-[8px] px-3 py-2 outline-none w-full text-slate-900 dark:text-white bg-white dark:bg-slate-900 border ${
            errors ? "border-red-500" : "border-gray-300 dark:border-slate-700"
          } ${surfaceInputClassName}`}
        />
      </div>
      {errors ? <span className="text-red-500 text-xs">{errors.message}</span> : null}
    </div>
  );
}

export default CurrencyField;
