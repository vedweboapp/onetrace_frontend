"use client";

import { useTranslations } from "next-intl";
import { SurfaceShell } from "@/shared/ui";

export function DocumentationPanel() {
  const t = useTranslations("Dashboard.settingsDocumentation");

  return (
    <SurfaceShell className="space-y-8 pb-12">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t("pageTitle")}</h1>
        <p className="max-w-3xl text-slate-600 dark:text-slate-300">{t("pageDescription")}</p>
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t("profile.title")}</h2>
        <p className="text-slate-600 dark:text-slate-300">{t("profile.description")}</p>
        <ul className="list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">
          <li>{t("profile.flow.load")}</li>
          <li>{t("profile.flow.edit")}</li>
          <li>{t("profile.flow.save")}</li>
          <li>{t("profile.flow.addresses")}</li>
        </ul>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t("publicQuotation.title")}</h2>
        <p className="text-slate-600 dark:text-slate-300">{t("publicQuotation.description")}</p>
        <ol className="list-decimal space-y-2 pl-5 text-slate-600 dark:text-slate-300">
          <li>{t("publicQuotation.flow.token")}</li>
          <li>{t("publicQuotation.flow.payload")}</li>
          <li>{t("publicQuotation.flow.preview")}</li>
        </ol>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t("settings.title")}</h2>
        <p className="text-slate-600 dark:text-slate-300">{t("settings.description")}</p>
        <ul className="list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">
          <li>{t("settings.flow.personalProfile")}</li>
          <li>{t("settings.flow.integration")}</li>
          <li>{t("settings.flow.documentation")}</li>
        </ul>
      </section>
    </SurfaceShell>
  );
}
