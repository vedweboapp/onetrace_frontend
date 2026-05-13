import { DashboardAppearanceScope } from "@/features/dashboard/components/dashboard-appearance-scope";
import { DashboardAuthGuard } from "@/features/dashboard/components/dashboard-auth-guard";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import {
  dashboardMainGutterClassName,
  dashboardPageContainerClassName,
} from "@/shared/config/dashboard-shell";
import { cn } from "@/core/utils/http.util";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardAuthGuard>
      <DashboardAppearanceScope
        className={cn(
          "flex h-dvh min-h-0 overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100",
        )}
      >
        <DashboardSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader />
          <main
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-slate-50 py-5 sm:py-6 dark:bg-slate-950 lg:py-8",
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
