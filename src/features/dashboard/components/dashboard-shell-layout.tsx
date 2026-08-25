"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { useShallow } from "zustand/react/shallow";
import { DashboardChromeSlot } from "@/features/dashboard/components/dashboard-chrome-slot";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardPageScrollHost } from "@/features/dashboard/components/dashboard-page-scroll-host";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { useDashboardAppearanceStore } from "@/features/settings/personal-profile/store/dashboard-appearance.store";

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
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <DashboardPageScrollHost>{children}</DashboardPageScrollHost>
    </main>
  );

  const contentColumn = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {headerBlock}
      {main}
    </div>
  );

  const shellRow = (
    <div className="flex h-0 min-h-0 flex-1 overflow-hidden">
      {!isBoron && !isHydrogen ? sidebar : null}
      {contentColumn}
      {isBoron ? sidebar : null}
    </div>
  );

  if (isHydrogen) {
    return (
      <div className="flex h-0 min-h-0 flex-1 overflow-hidden">
        <div className="contents md:hidden">{sidebar}</div>
        {contentColumn}
      </div>
    );
  }

  return shellRow;
}
