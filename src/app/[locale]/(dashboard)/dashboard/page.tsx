import { getTranslations } from "next-intl/server";
import { DashboardUnderDevelopmentState, SurfaceShell } from "@/shared/ui";

export default async function DashboardIndexPage() {
  const t = await getTranslations("Dashboard.home");
  return (
    <SurfaceShell className="border-dashed">
      <DashboardUnderDevelopmentState
        className="min-h-[calc(100vh-180px)]"
        title={t("title")}
        description={t("body")}
      />
    </SurfaceShell>
  );
}
