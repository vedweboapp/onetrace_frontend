"use client";

import { cn } from "@/core/utils/http.util";

export type ActiveStatusBadgeProps = {
  active: boolean;
  label: string;
  className?: string;
};

/** Rounded pill with dot: green when active, rose when inactive (used across list cards, tables, and detail headers). */
export function ActiveStatusBadge({ active, label, className }: ActiveStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        active
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
          : "bg-rose-100 text-rose-800 dark:bg-rose-950/45 dark:text-rose-200",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          active ? "bg-emerald-500 dark:bg-emerald-400" : "bg-rose-500 dark:bg-rose-400",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
