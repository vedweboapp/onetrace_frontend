"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CUSTOMIZATION_SETTINGS_ITEMS } from "@/shared/config/customization-settings-items";
import { cn } from "@/core/utils/http.util";
import { ListPageCardGrid, SurfaceShell } from "@/shared/ui";

export function CustomizationSettingsHub() {
  const t = useTranslations("Dashboard.settingsNav.customization");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("hubTitle")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{t("hubDescription")}</p>
      </div>

      <SurfaceShell className="rounded-none">
        <div className="p-4 sm:p-6">
          <ListPageCardGrid className="sm:grid-cols-1 lg:grid-cols-2">
            {CUSTOMIZATION_SETTINGS_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "group flex h-full items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-950/[0.03] transition",
                    "hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 dark:ring-white/[0.04]",
                    "dark:hover:border-slate-700 dark:hover:bg-slate-900/80",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700",
                      "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                    )}
                    aria-hidden
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {t(`items.${item.id}.title`)}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
                      {t(`items.${item.id}.description`)}
                    </span>
                  </span>
                  <ChevronRight
                    className="mt-0.5 size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </ListPageCardGrid>
        </div>
      </SurfaceShell>
    </div>
  );
}
