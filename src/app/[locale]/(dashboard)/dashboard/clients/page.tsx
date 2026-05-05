import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ClientsPanel } from "@/features/clients/components/clients-panel";
import { PageHeadingWithBack } from "@/shared/components/layout/page-heading-with-back";
import { cn } from "@/core/utils/http.util";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.clients");
  return { title: t("metaTitle") };
}

export default async function DashboardClientsPage() {
  const t = await getTranslations("Dashboard.clients");

  return (
    <div className="pb-12">
      <PageHeadingWithBack
        title={t("title")}
        description={t("subtitle")}
        density="compact"
        className={cn("border-b border-slate-200/90 pb-4 dark:border-slate-800", "mb-4")}
      />
      <Suspense
        fallback={
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        }
      >
        <ClientsPanel />
      </Suspense>
    </div>
  );
}
