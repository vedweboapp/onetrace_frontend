"use client";

import * as React from "react";
import { cn } from "@/core/utils/http.util";
import { useOrgCurrency } from "@/shared/money/use-org-currency";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & {
  className?: string;
  inputClassName?: string;
  invalid?: boolean;
};

/**
 * Number input with organization currency symbol/code affixed
 * (Company Settings → Currencies position).
 */
export function MoneyInput({
  className,
  inputClassName,
  invalid = false,
  disabled,
  ...inputProps
}: Props) {
  const { settings, affix } = useOrgCurrency();
  const before = settings.symbolPosition === "before";

  return (
    <div
      className={cn(
        "flex h-11 w-full min-w-0 items-center rounded-xl border border-slate-200 bg-white text-sm shadow-sm transition",
        "focus-within:border-[color:var(--dash-accent,#111111)] focus-within:ring-2 focus-within:ring-[color:var(--dash-accent,#111111)]/20",
        "dark:border-slate-700 dark:bg-slate-950",
        invalid && "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20",
        disabled && "opacity-60",
        className,
      )}
    >
      {before ? (
        <span className="shrink-0 pl-3.5 text-sm font-medium text-slate-500 dark:text-slate-400" aria-hidden>
          {affix}
        </span>
      ) : null}
      <input
        {...inputProps}
        disabled={disabled}
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent py-0 text-sm text-slate-900 outline-none",
          "placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
          "disabled:cursor-not-allowed",
          before ? "pr-3.5 pl-1.5" : "pl-3.5 pr-1.5",
          inputClassName,
        )}
      />
      {!before ? (
        <span className="shrink-0 pr-3.5 text-sm font-medium text-slate-500 dark:text-slate-400" aria-hidden>
          {affix}
        </span>
      ) : null}
    </div>
  );
}
