import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppearancePanel } from "@/features/dashboard/settings/appearance-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.appearance");
  return { title: t("metaTitle") };
}

export default async function DashboardAppearancePage() {
  const t = await getTranslations("Dashboard.appearance");

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950/80">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--dash-accent,#4f46e5)]">
          {t("pageKicker")}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>
      <AppearancePanel />
    </div>
  );
}
