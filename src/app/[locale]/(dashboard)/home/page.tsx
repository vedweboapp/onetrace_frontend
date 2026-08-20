import { getTranslations } from "next-intl/server";
import { DashboardUnderDevelopmentState, SurfaceShell } from "@/shared/ui";
import { entityDetailSurfaceClassName } from "@/shared/components/layout/detail-tab-layout";

export default async function DashboardIndexPage() {
  const t = await getTranslations("Dashboard.home");
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <SurfaceShell className={entityDetailSurfaceClassName}>
        <DashboardUnderDevelopmentState title={t("title")} description={t("body")} />
      </SurfaceShell>
    </div>
  );
}
