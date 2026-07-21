"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/core/utils/http.util";

export type InputWithEndSelectOption = {
  value: string;
  label: string;
};

type Props = {
  inputId?: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  inputType?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number;
  step?: string | number;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  selectValue: string;
  onSelectChange: (value: string) => void;
  selectOptions: InputWithEndSelectOption[];
  selectAriaLabel: string;
  selectPlaceholder?: string;
  selectDisabled?: boolean;
  className?: string;
};

const frameClassName = cn(
  "flex h-11 w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm transition",
  "focus-within:border-[color:var(--dash-accent,#111111)] focus-within:ring-2 focus-within:ring-[color:var(--dash-accent,#111111)]/20",
  "dark:border-slate-700 dark:bg-slate-950",
);

const inputClassName = cn(
  "min-w-0 flex-1 border-0 bg-transparent px-3.5 text-sm text-slate-900 outline-none",
  "placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
  "disabled:cursor-not-allowed disabled:text-slate-400",
);

const selectWrapClassName =
  "relative flex h-full shrink-0 items-stretch border-l border-slate-200 dark:border-slate-700";

const selectClassName = cn(
  "h-full min-w-[6.5rem] max-w-[9.5rem] cursor-pointer appearance-none border-0 bg-transparent py-0 pl-2.5 pr-7 text-sm text-slate-900 outline-none",
  "disabled:cursor-not-allowed disabled:text-slate-400",
  "dark:text-slate-100",
);

export function InputWithEndSelect({
  inputId,
  inputValue,
  onInputChange,
  inputType = "text",
  inputMode,
  min,
  step,
  placeholder,
  disabled = false,
  invalid = false,
  selectValue,
  onSelectChange,
  selectOptions,
  selectAriaLabel,
  selectPlaceholder,
  selectDisabled = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        frameClassName,
        invalid && "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20 dark:border-red-500",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        id={inputId}
        type={inputType}
        inputMode={inputMode}
        min={min}
        step={step}
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
      />
      <div className={selectWrapClassName}>
        <select
          aria-label={selectAriaLabel}
          value={selectValue}
          onChange={(e) => onSelectChange(e.target.value)}
          disabled={disabled || selectDisabled}
          className={selectClassName}
        >
          {selectPlaceholder ? <option value="">{selectPlaceholder}</option> : null}
          {selectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-400"
          aria-hidden
        />
      </div>
    </div>
  );
}
