import type { ReactNode } from "react";
import { DashboardAppearanceScope } from "@/components/dashboard/dashboard-appearance-scope";
import { DashboardAuthGuard } from "@/components/dashboard/dashboard-auth-guard";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardAuthGuard>
      <DashboardAppearanceScope className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader />
          <main className="flex-1 bg-slate-50 px-4 py-6 lg:px-8 lg:py-8 dark:bg-slate-950">
            {children}
          </main>
        </div>
      </DashboardAppearanceScope>
    </DashboardAuthGuard>
  );
}
