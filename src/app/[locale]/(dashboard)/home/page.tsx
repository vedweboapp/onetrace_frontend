import { getTranslations } from "next-intl/server";
import { DashboardUnderDevelopmentState, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

export default async function DashboardIndexPage() {
  const t = await getTranslations("Dashboard.home");
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden data-dashboard-fill-page">
      <SurfaceShell className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <DashboardUnderDevelopmentState title={t("title")} description={t("body")} viewportFill={false} />
      </SurfaceShell>
    </div>
  );
}
