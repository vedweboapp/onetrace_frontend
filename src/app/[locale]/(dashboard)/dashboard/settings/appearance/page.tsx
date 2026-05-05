import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppearancePanel } from "@/features/dashboard/settings/appearance-panel";
import { PageHeadingWithBack } from "@/shared/components/layout/page-heading-with-back";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.appearance");
  return { title: t("metaTitle") };
}

export default async function DashboardAppearancePage() {
  const t = await getTranslations("Dashboard.appearance");
  const tCommon = await getTranslations("Dashboard.common");

  return (
    <div className="pb-16">
      <PageHeadingWithBack
        backHref={routes.dashboard.projects}
        backAriaLabel={tCommon("back")}
        title={t("title")}
        description={t("subtitle")}
        className={cn(
          "border-b border-slate-200/90 pb-8 dark:border-slate-800",
          "mb-8 sm:mb-10",
        )}
      />
      <AppearancePanel />
    </div>
  );
}
