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
  "flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 px-4 py-4 sm:px-6 dark:border-slate-800",
);

export const detailTabBodyClassName = "px-4 py-3 sm:px-6 sm:py-4";

export const detailTabEmptyClassName =
  "px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400 sm:px-6";

export const detailTabErrorClassName =
  "px-4 py-8 text-center text-sm text-red-600 dark:text-red-400 sm:px-6";

/** Entity detail page — natural height; outer dashboard container scrolls (avoids double scrollbars). */
export const entityDetailPageClassName = cn("w-full min-w-0");

/** White record shell — no nested scroll; page scroll handles overflow. */
export const entityDetailSurfaceClassName = cn("mt-3 min-w-0");

export const entityDetailSurfaceInnerClassName = "min-w-0 w-full";

/** Tab panel wrapper inside the record shell. */
export const entityDetailTabPanelClassName = "min-w-0 w-full";

/**
 * List-style detail tabs (contacts, projects, …) fill remaining height when
 * empty, loading, or errored so the panel is not a short island in gray space.
 */
export const detailTabFillViewportClassName = cn(
  "flex min-h-0 flex-1 flex-col",
  "min-h-[min(28rem,calc(100dvh-14rem))]",
);

/** Centered empty / loading / error content inside a fill tab. */
export const detailTabFillStateClassName = cn(
  "flex w-full flex-1 flex-col items-center justify-center px-6 py-10 text-center sm:py-14",
);
