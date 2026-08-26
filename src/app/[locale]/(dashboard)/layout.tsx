import { DashboardAppearanceScope } from "@/features/dashboard/components/dashboard-appearance-scope";
import { DashboardAuthGuard } from "@/features/dashboard/components/dashboard-auth-guard";
import { DashboardShellLayout } from "@/features/dashboard/components/dashboard-shell-layout";
import { NavigationBackTracker } from "@/shared/components/navigation/navigation-back-tracker";
import { OrgCurrencyBootstrap } from "@/shared/money/use-org-currency";
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
          "flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100",
        )}
      >
        <DashboardShellLayout>{children}</DashboardShellLayout>
      </DashboardAppearanceScope>
    </DashboardAuthGuard>
  );
}
