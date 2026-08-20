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
  "flex flex-wrap items-center justify-end gap-3 border-b border-slate-200/90 px-4 py-4 sm:px-6 dark:border-slate-800",
);

export const detailTabBodyClassName = "px-4 py-3 sm:px-6 sm:py-4";

export const detailTabEmptyClassName =
  "px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400 sm:px-6";

export const detailTabErrorClassName =
  "px-4 py-8 text-center text-sm text-red-600 dark:text-red-400 sm:px-6";

/** Entity detail page — at least one viewport under dashboard chrome (header + page padding). */
export const entityDetailPageClassName = cn(
  "flex min-h-[calc(100dvh-7.5rem)] w-full min-w-0 flex-col",
);

/** White record shell grows with tab content; empty/loading tabs fill the pane. */
export const entityDetailSurfaceClassName = cn(
  "mt-3 flex min-h-0 flex-1 flex-col overflow-hidden",
);

export const entityDetailSurfaceInnerClassName = "flex min-h-0 flex-1 flex-col";

/** Tab panel wrapper inside the record shell. */
export const entityDetailTabPanelClassName = "flex min-h-0 min-w-0 flex-1 flex-col";

/**
 * List-style detail tabs (contacts, projects, …) fill remaining height when
 * empty, loading, or errored so the panel is not a short island in gray space.
 */
export const detailTabFillViewportClassName = cn(
  "flex min-h-0 flex-1 flex-col",
  "min-h-[calc(100dvh-13.5rem)]",
);

/** Centered empty / loading / error content inside a fill tab. */
export const detailTabFillStateClassName = cn(
  "flex w-full flex-1 flex-col items-center justify-center px-6 py-10 text-center sm:py-14",
);
