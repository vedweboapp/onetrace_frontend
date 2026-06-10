"use client";

import { cn } from "@/core/utils/http.util";
import type { DispatchReturnRequestStatus } from "@/features/dispatches/types/dispatch.types";

const STATUS_STYLES: Record<DispatchReturnRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
};

type Props = {
  status: DispatchReturnRequestStatus;
  label: string;
};

export function ReturnRequestStatusBadge({ status, label }: Props) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {label}
    </span>
  );
}
