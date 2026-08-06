import { cn } from "@/core/utils/http.util";

/** Shared Zoho-compact layout tokens for entity detail tab panels. */

export const detailTabSectionClassName =
  "min-w-0 divide-y divide-slate-100 dark:divide-slate-800";

export const detailTabTitleClassName = "px-4 py-2.5 sm:px-6";

export const detailTabFilterBarClassName = cn(
  "flex min-w-0 flex-col gap-2 px-4 py-2.5",
  "sm:flex-row sm:flex-wrap sm:items-center sm:px-6",
);

export const detailTabToolbarClassName = cn(
  "flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6",
);

export const detailTabBodyClassName = "px-4 py-3 sm:px-6 sm:py-4";

export const detailTabEmptyClassName =
  "px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400 sm:px-6";

export const detailTabErrorClassName =
  "px-4 py-8 text-center text-sm text-red-600 dark:text-red-400 sm:px-6";
