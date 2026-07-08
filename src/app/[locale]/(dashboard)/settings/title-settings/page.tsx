import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { TitleSettingsPanel } from "@/features/titles/components/title-settings-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.titleSettings");
  return { title: t("metaTitle") };
}

export default async function TitleSettingsPage() {
  return (
    <div className="pb-16">
      <Suspense
        fallback={
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        }
      >
        <TitleSettingsPanel />
      </Suspense>
    </div>
  );
}
