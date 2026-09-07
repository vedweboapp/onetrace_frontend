"use client";

import { cn } from "@/core/utils/http.util";

const STATUS_STYLES: Record<string, string> = {
  dispatched: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  in_transit: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  processing: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  delayed: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
};

type Props = {
  status: string;
  label: string;
};

export function DispatchStatusBadge({ status, label }: Props) {
  const norm = status.trim().toLowerCase().replace(/\s+/g, "_");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        STATUS_STYLES[norm] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {label}
    </span>
  );
}
