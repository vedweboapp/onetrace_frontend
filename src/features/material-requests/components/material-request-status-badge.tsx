"use client";

import { cn } from "@/core/utils/http.util";
import { normalizeMaterialRequestStatus } from "@/features/material-requests/utils/material-request-nested-fields.util";

type Props = {
  status: string | null | undefined;
  label: string;
  className?: string;
};

export function MaterialRequestStatusBadge({ status, label, className }: Props) {
  const norm = normalizeMaterialRequestStatus(status);
  const tone =
    norm === "dispatched"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300"
      : norm === "partially_dispatched" || norm === "partial"
        ? "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300"
        : norm === "pending"
          ? "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300"
          : norm === "draft"
            ? "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300"
            : "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {label}
    </span>
  );
}
