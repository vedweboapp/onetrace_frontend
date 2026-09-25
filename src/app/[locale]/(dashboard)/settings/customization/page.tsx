import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CustomizationSettingsHub } from "@/features/settings/customization/components/customization-settings-hub";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.settingsNav");
  return { title: t("customization.label") };
}

export default async function DashboardCustomizationSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      }
    >
      <CustomizationSettingsHub />
    </Suspense>
  );
}
