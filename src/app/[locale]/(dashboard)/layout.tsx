import { DashboardAppearanceScope } from "@/features/dashboard/components/dashboard-appearance-scope";
import { DashboardAuthGuard } from "@/features/dashboard/components/dashboard-auth-guard";
import { DashboardChromeSlot } from "@/features/dashboard/components/dashboard-chrome-slot";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { NavigationBackTracker } from "@/shared/components/navigation/navigation-back-tracker";
import { OrgCurrencyBootstrap } from "@/shared/money/use-org-currency";
import {
  dashboardMainGutterClassName,
  dashboardPageContainerClassName,
} from "@/shared/config/dashboard-shell";
import { cn } from "@/core/utils/http.util";
import type { ReactNode } from "react";
import { Suspense } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardAuthGuard>
      <OrgCurrencyBootstrap />
      <Suspense fallback={null}>
        <NavigationBackTracker />
      </Suspense>
      <DashboardAppearanceScope
        className={cn(
          "flex h-dvh min-h-0 overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100",
        )}
      >
        <Suspense fallback={null}>
          <DashboardSidebar />
        </Suspense>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <Suspense fallback={null}>
              <DashboardHeader />
            </Suspense>
            <DashboardChromeSlot />
          </div>
          <main
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-slate-50 py-5 sm:py-6 dark:bg-slate-950",
              dashboardMainGutterClassName,
            )}
          >
            <div className={dashboardPageContainerClassName}>{children}</div>
          </main>
        </div>
      </DashboardAppearanceScope>
    </DashboardAuthGuard>
  );
}
