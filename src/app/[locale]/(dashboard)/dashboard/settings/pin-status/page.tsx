import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PinStatusSettingsPanel } from "@/features/pin-status/components/pin-status-settings-panel";
import { PageHeadingWithBack } from "@/shared/components/layout/page-heading-with-back";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.pinStatus");
  return { title: t("metaTitle") };
}

export default async function DashboardPinStatusSettingsPage() {
  const t = await getTranslations("Dashboard.pinStatus");
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
      <Suspense
        fallback={
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        }
      >
        <PinStatusSettingsPanel />
      </Suspense>
    </div>
  );
}
