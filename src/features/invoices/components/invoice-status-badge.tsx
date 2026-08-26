"use client";

import { cn } from "@/core/utils/http.util";
import { normalizeInvoiceStatus } from "@/features/invoices/utils/invoice-nested-fields.util";

type Props = {
  status: string | null | undefined;
  label: string;
  className?: string;
};

export function InvoiceStatusBadge({ status, label, className }: Props) {
  const norm = normalizeInvoiceStatus(status);
  const tone =
    norm === "paid"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300"
      : norm === "pending"
        ? "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300"
        : norm === "overdue"
          ? "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300"
          : "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span
      className={cn(
        // w-fit / self-start: detail field wraps use align-items:stretch and would
        // otherwise pull the pill to full column width.
        "inline-flex w-fit max-w-full shrink-0 self-start items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
