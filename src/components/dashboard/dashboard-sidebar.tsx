"use client";

import { FolderKanban, Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { DashboardAppBrand } from "@/components/dashboard/dashboard-app-brand";
import { useDashboardAppearanceStore } from "@/features/dashboard/store/dashboard-appearance-store";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar-store";
import { resolveDashboardAccent } from "@/features/dashboard/lib/accent-resolve";
import { routes } from "@/shared/config/routes";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";

function isSettingsArea(pathname: string) {
  return (
    pathname === routes.dashboard.settings ||
    pathname.startsWith(`${routes.dashboard.settings}/`)
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const accentSlice = useDashboardAppearanceStore(
    useShallow((s) => ({
      accentKind: s.accentKind,
      accent: s.accent,
      customAccentHex: s.customAccentHex,
    })),
  );
  const resolved = resolveDashboardAccent(accentSlice);
  const sidebarOpen = useDashboardSidebarStore((s) => s.sidebarOpen);

  const shell = cn(
    "hidden shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
    sidebarOpen ? "md:flex md:w-64" : "md:hidden",
  );

  if (isSettingsArea(pathname)) {
    return (
      <aside id="dashboard-sidebar" className={shell}>
        <DashboardSettingsSidebar resolved={resolved} />
      </aside>
    );
  }

  return (
    <aside id="dashboard-sidebar" className={shell}>
      <DashboardMainSidebar resolved={resolved} />
    </aside>
  );
}

function navInactive() {
  return cn(
    "text-slate-800 hover:bg-slate-100 hover:text-slate-950",
    "dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-white",
  );
}

function DashboardMainSidebar({
  resolved,
}: {
  resolved: ReturnType<typeof resolveDashboardAccent>;
}) {
  const t = useTranslations("Dashboard.sidebar");
  const pathname = usePathname();
  const projectsHref = routes.dashboard.projects;
  const active =
    pathname === projectsHref || pathname.startsWith(`${projectsHref}/`);

  return (
    <>
      <div className="flex h-14 items-center border-b border-slate-200 px-4 dark:border-slate-800">
        <DashboardAppBrand />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <Link
          href={projectsHref}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
            active ? resolved.navActiveClassName : navInactive(),
          )}
          style={active ? resolved.navActiveStyle : undefined}
        >
          <FolderKanban
            className={cn(
              "size-[18px] shrink-0",
              active ? "opacity-95" : "text-slate-600 dark:text-slate-400",
            )}
            strokeWidth={1.75}
          />
          {t("projects")}
        </Link>
      </nav>
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <p className="truncate px-2 text-xs font-medium text-slate-600 dark:text-slate-400">
          {t("footerHint")}
        </p>
      </div>
    </>
  );
}

function DashboardSettingsSidebar({
  resolved,
}: {
  resolved: ReturnType<typeof resolveDashboardAccent>;
}) {
  const t = useTranslations("Dashboard.settingsNav");
  const pathname = usePathname();
  const appearanceHref = routes.dashboard.settingsAppearance;

  const appearanceActive =
    pathname === appearanceHref || pathname.startsWith(`${appearanceHref}/`);

  return (
    <>
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {t("title")}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("sidebarSubtitle")}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <Link
          href={appearanceHref}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
            appearanceActive ? resolved.navActiveClassName : navInactive(),
          )}
          style={appearanceActive ? resolved.navActiveStyle : undefined}
        >
          <Palette
            className={cn(
              "size-[18px] shrink-0",
              appearanceActive ? "opacity-95" : "text-slate-600 dark:text-slate-400",
            )}
            strokeWidth={1.75}
          />
          {t("appearance")}
        </Link>
      </nav>
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <p className="truncate px-2 text-xs font-medium text-slate-600 dark:text-slate-400">{t("hint")}</p>
      </div>
    </>
  );
}
