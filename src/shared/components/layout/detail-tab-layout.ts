import { cn } from "@/core/utils/http.util";

/** Shared Zoho-compact layout tokens for entity detail tab panels. */

export const detailTabSectionClassName =
  "min-w-0 divide-y divide-slate-100 dark:divide-slate-800";

export const detailTabTitleClassName = "px-4 py-2.5 sm:px-6";

export const detailTabFilterBarClassName = cn(
  "flex min-w-0 flex-col gap-2 px-4 py-2.5",
  "sm:flex-row sm:flex-wrap sm:items-center sm:px-6",
);

/** Compact toolbar above detail list tables (Add contact, etc.). */
export const detailTabToolbarClassName = cn(
  "flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 px-4 py-2.5 sm:px-5 dark:border-slate-800",
);

export const detailTabBodyClassName = "px-4 py-3 sm:px-6 sm:py-4";

/**
 * Table + pagination body for detail list tabs — edge-to-edge table,
 * flex column so pagination sticks to the card footer.
 */
export const detailTabTableBodyClassName = cn(
  "flex min-h-0 flex-1 flex-col overflow-hidden",
);

export const detailTabEmptyClassName =
  "px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400 sm:px-6";

export const detailTabErrorClassName =
  "px-4 py-8 text-center text-sm text-red-600 dark:text-red-400 sm:px-6";

/**
 * Entity detail page — natural height only.
 * Outer dashboard `overflow-y-auto` is the single scrollbar (same as client/site detail).
 * Do not add min-h / flex-1 / overflow here or the white card nests a second scroll.
 */
export const entityDetailPageClassName = cn("w-full min-w-0");

/** White record shell — grows with content; no nested overflow scroll. */
export const entityDetailSurfaceClassName = cn("mt-2 min-w-0 overflow-visible");

export const entityDetailSurfaceInnerClassName = "min-w-0 w-full";

/** Tab panel wrapper inside the record shell (overview / form-style content). */
export const entityDetailTabPanelClassName = "min-w-0 w-full";

/**
 * List-style detail tabs / empty shells — fill remaining viewport so empty,
 * WIP, and error states center on every screen size (not a short island).
 */
export const detailTabFillViewportClassName = cn(
  "flex min-h-0 w-full flex-1 flex-col",
  "min-h-[calc(100dvh-11.5rem)] sm:min-h-[calc(100dvh-13rem)] lg:min-h-[calc(100dvh-14rem)]",
);

/** Centered empty / loading / error content inside a fill tab or list shell. */
export const detailTabFillStateClassName = cn(
  "flex h-full w-full min-h-0 flex-1 flex-col items-center justify-center",
  "px-6 py-12 text-center sm:px-10 sm:py-16",
);
