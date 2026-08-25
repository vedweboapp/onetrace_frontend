import { cn } from "@/core/utils/http.util";

/**
 * Single horizontal inset for the dashboard toolbar, mobile tab bar, `<main>` body, and headings.
 * Keeps screen titles vertically stacked with header controls so left/right edges align.
 */
export const dashboardContentHorizontalGutterClassName = cn("px-4 lg:px-6");

/** Applied to `<main>` so page content shares the same left/right gutters as the dashboard header row. */
export const dashboardMainGutterClassName = cn(dashboardContentHorizontalGutterClassName);

/**
 * Max-width column pinned to the **start** of `<main>` (not centered), so headings share the header’s inset.
 */
export const dashboardPageContainerClassName = cn("w-full min-w-0");

/** List table shell flush under the page subheader (full-bleed with header). */
export const dashboardListTableShellClassName = cn(
  "-mx-4 rounded-none border-x-0 border-t-0 shadow-none ring-0 lg:-mx-6",
);

/** Wrapper for list / fill-height dashboard pages (prefer over `h-full`). */
export const dashboardFillPageFrameClassName = cn(
  "flex min-h-0 flex-1 flex-col overflow-hidden",
);
