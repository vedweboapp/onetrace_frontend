import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DataAdministrationPanel } from "@/features/settings/data-administration/components/data-administration-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.dataAdministration");
  return { title: t("metaTitle") };
}

export default async function DataAdministrationSettingsPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
      <Suspense
        fallback={
          <div className="space-y-2">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        }
      >
        <DataAdministrationPanel />
      </Suspense>
    </div>
  );
}
