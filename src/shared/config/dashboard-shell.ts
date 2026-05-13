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
export const dashboardPageContainerClassName = cn(
  "w-full min-w-0",
);
