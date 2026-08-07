"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { useShallow } from "zustand/react/shallow";
import { DashboardChromeSlot } from "@/features/dashboard/components/dashboard-chrome-slot";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { useDashboardAppearanceStore } from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import {
  dashboardMainGutterClassName,
  dashboardPageContainerClassName,
} from "@/shared/config/dashboard-shell";
import { cn } from "@/core/utils/http.util";

type Props = {
  children: ReactNode;
};

/**
 * Arranges sidebar + header + main based on Appearance → Dashboard layout:
 * - lithium: left sidebar (default)
 * - hydrogen: top navigation (sidebar hidden on md+)
 * - boron: right sidebar
 */
export function DashboardShellLayout({ children }: Props) {
  const sidebarLayout = useDashboardAppearanceStore(
    useShallow((s) => s.sidebarLayout),
  );

  const isHydrogen = sidebarLayout === "hydrogen";
  const isBoron = sidebarLayout === "boron";

  const sidebar = (
    <Suspense fallback={null}>
      <DashboardSidebar />
    </Suspense>
  );

  const headerBlock = (
    <div className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <Suspense fallback={null}>
        <DashboardHeader />
      </Suspense>
      <DashboardChromeSlot />
    </div>
  );

  const main = (
    <main
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950",
        dashboardMainGutterClassName,
      )}
    >
      <div
        className={cn(
          dashboardPageContainerClassName,
          // Non-list pages (settings, forms, detail) scroll here.
          // List pages use h-full + overflow-hidden so only the table body scrolls.
          "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain py-4 sm:py-5",
        )}
      >
        {children}
      </div>
    </main>
  );

  const contentColumn = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {headerBlock}
      {main}
    </div>
  );

  if (isHydrogen) {
    return (
      <>
        {/* Keep sidebar for mobile / accessibility; hide on md+ when Hydrogen is active */}
        <div className="contents md:hidden">{sidebar}</div>
        {contentColumn}
      </>
    );
  }

  if (isBoron) {
    return (
      <>
        {contentColumn}
        {sidebar}
      </>
    );
  }

  return (
    <>
      {sidebar}
      {contentColumn}
    </>
  );
}
