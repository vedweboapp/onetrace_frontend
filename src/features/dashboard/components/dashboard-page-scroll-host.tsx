"use client";

import type { ReactNode } from "react";
import * as React from "react";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";
import {
  dashboardMainGutterClassName,
  dashboardPageContainerClassName,
} from "@/shared/config/dashboard-shell";
import { cn } from "@/core/utils/http.util";

function detectFillPage(root: HTMLElement | null): boolean {
  if (!root) return false;
  return Boolean(root.querySelector("[data-list-page], [data-dashboard-fill-page]"));
}

/**
 * Constrains dashboard page height to the viewport and chooses scroll mode:
 * - fill pages (lists, entity detail): no outer scroll; inner panes scroll
 * - everything else: main column scrolls
 */
export function DashboardPageScrollHost({ children }: { children: ReactNode }) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [fillPage, setFillPage] = React.useState(false);
  const sidebarOpen = useDashboardSidebarStore((s) => s.sidebarOpen);

  const syncFillMode = React.useCallback(() => {
    setFillPage(detectFillPage(hostRef.current));
  }, []);

  React.useLayoutEffect(() => {
    syncFillMode();
    const root = hostRef.current;
    if (!root) return;

    const observer = new MutationObserver(syncFillMode);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [syncFillMode, children]);

  // Sidebar width transition reflows the flex column — re-sync after toggle.
  React.useLayoutEffect(() => {
    syncFillMode();
    const id = requestAnimationFrame(syncFillMode);
    return () => cancelAnimationFrame(id);
  }, [sidebarOpen, syncFillMode]);

  return (
    <div
      ref={hostRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div
        className={cn(
          dashboardPageContainerClassName,
          dashboardMainGutterClassName,
          "flex min-h-0 flex-1 flex-col",
          fillPage
            ? "overflow-hidden pt-4 sm:pt-5"
            : "overflow-y-auto overscroll-y-contain py-4 sm:py-5",
        )}
      >
        {children}
      </div>
    </div>
  );
}
