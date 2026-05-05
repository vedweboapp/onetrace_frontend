import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { GroupsPanel } from "@/features/groups/components/groups-panel";
import { Link } from "@/i18n/navigation";
import { PageHeadingWithBack } from "@/shared/components/layout/page-heading-with-back";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.groups");
  return { title: t("metaTitle") };
}

async function CompositeHint() {
  const t = await getTranslations("Dashboard.groups");

  return (
    <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
      {t("compositeHint.prefix")}{" "}
      <Link
        href={routes.dashboard.compositeItems}
        className="font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
      >
        {t("compositeHint.link")}
      </Link>
      {t("compositeHint.suffix")}
    </p>
  );
}

export default async function DashboardGroupsPage() {
  const t = await getTranslations("Dashboard.groups");

  return (
    <div className="pb-12">
      <PageHeadingWithBack
        title={t("title")}
        description={t("subtitle")}
        density="compact"
        className={cn("border-b border-slate-200/90 pb-4 dark:border-slate-800", "mb-3")}
      />
      <CompositeHint />
      <Suspense
        fallback={
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        }
      >
        <GroupsPanel />
      </Suspense>
    </div>
  );
}
