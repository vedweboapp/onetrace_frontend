"use client";

import { cn } from "@/core/utils/http.util";

type Props = {
  fulfilled: number;
  surplus: number;
  unitsLabel: string;
  className?: string;
};

export function DispatchedQuantityCell({ fulfilled, surplus, unitsLabel, className }: Props) {
  if (fulfilled <= 0 && surplus <= 0) {
    return <span className={cn("tabular-nums text-slate-500", className)}>0 {unitsLabel}</span>;
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center justify-end gap-1.5", className)}>
      {fulfilled > 0 ? (
        <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
          {fulfilled.toFixed(0)} {unitsLabel}
        </span>
      ) : null}
      {surplus > 0 ? (
        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          +{surplus.toFixed(0)} {unitsLabel}
        </span>
      ) : null}
    </span>
  );
}
