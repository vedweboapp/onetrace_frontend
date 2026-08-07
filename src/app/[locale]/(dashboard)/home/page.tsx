import { getTranslations } from "next-intl/server";
import { DashboardUnderDevelopmentState, SurfaceShell } from "@/shared/ui";

export default async function DashboardIndexPage() {
  const t = await getTranslations("Dashboard.home");
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <SurfaceShell className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-slate-200 shadow-none ring-0 dark:border-slate-800">
        <DashboardUnderDevelopmentState title={t("title")} description={t("body")} />
      </SurfaceShell>
    </div>
  );
}
