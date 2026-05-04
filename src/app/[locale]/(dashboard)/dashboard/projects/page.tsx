import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.projects");
  return { title: t("metaTitle") };
}

export default async function DashboardProjectsPage() {
  const t = await getTranslations("Dashboard.projects");

  return (
    <div className="mx-auto max-w-3xl space-y-2">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {t("title")}
      </h2>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{t("body")}</p>
    </div>
  );
}
