import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CompositeItemsPanel } from "@/features/composite-items/components/composite-items-panel";
import { Link } from "@/i18n/navigation";
import { PageHeadingWithBack } from "@/shared/components/layout/page-heading-with-back";
import { routes } from "@/shared/config/routes";
import { ListPageCallout } from "@/shared/components/layout/list-page-callout";
import { cn } from "@/core/utils/http.util";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.compositeItems");
  return { title: t("metaTitle") };
}

async function GroupsHint() {
  const t = await getTranslations("Dashboard.compositeItems");

  return (
    <ListPageCallout>
      <span className="text-slate-600 dark:text-slate-400">
        {t("groupsHint.prefix")}{" "}
        <Link
          href={routes.dashboard.groups}
          className="font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
        >
          {t("groupsHint.link")}
        </Link>
        {t("groupsHint.suffix")}
      </span>
    </ListPageCallout>
  );
}

export default async function DashboardCompositeItemsPage() {
  const t = await getTranslations("Dashboard.compositeItems");

  return (
    <div className="pb-12">
      <PageHeadingWithBack
        title={t("title")}
        description={t("subtitle")}
        density="compact"
        className={cn("border-b border-slate-200/90 pb-4 dark:border-slate-800", "mb-3")}
      />
      <GroupsHint />
      <Suspense
        fallback={
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        }
      >
        <CompositeItemsPanel />
      </Suspense>
    </div>
  );
}
