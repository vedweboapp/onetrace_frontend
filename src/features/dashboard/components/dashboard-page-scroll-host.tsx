"use client";

import type { ReactNode } from "react";
import * as React from "react";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";
import {
  dashboardMainGutterClassName,
  dashboardPageContainerClassName,
} from "@/shared/config/dashboard-shell";
import { cn } from "@/core/utils/http.util";

/**
 * Constrains dashboard page height to the viewport and chooses scroll mode via CSS `:has()`:
 * - fill pages (`.dashboard-list-page` / data markers): no outer scroll; inner panes scroll
 * - everything else: this pane scrolls
 *
 * CSS-driven mode avoids JS starting in "scroll" mode and desyncing when the sidebar
 * width animates (which previously left a second scrollbar + empty bottom strip).
 */
export function DashboardPageScrollHost({ children }: { children: ReactNode }) {
  const sidebarOpen = useDashboardSidebarStore((s) => s.sidebarOpen);

  // Sidebar width transition changes available width — nudge layout after it settles.
  React.useLayoutEffect(() => {
    const bump = () => window.dispatchEvent(new Event("resize"));
    const frame = requestAnimationFrame(bump);
    const t = window.setTimeout(bump, 220);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t);
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "dashboard-page-scroll-pane",
          dashboardPageContainerClassName,
          dashboardMainGutterClassName,
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overscroll-y-contain",
          // Default: natural-height pages scroll here. Fill pages override in globals.css.
          "overflow-y-auto pt-4 pb-4 sm:pt-5 sm:pb-5",
        )}
      >
        {children}
      </div>
    </div>
  );
}
