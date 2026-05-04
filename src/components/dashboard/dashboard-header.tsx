"use client";

import { FolderKanban, LogOut, PanelLeft, PanelLeftClose, Palette, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { DashboardAppBrand } from "@/components/dashboard/dashboard-app-brand";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useDashboardAppearanceStore } from "@/features/dashboard/store/dashboard-appearance-store";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar-store";
import { resolveDashboardAccent } from "@/features/dashboard/lib/accent-resolve";
import { routes } from "@/shared/config/routes";
import { AppButton } from "@/shared/ui";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";

function isSettingsArea(pathname: string) {
  return (
    pathname === routes.dashboard.settings ||
    pathname.startsWith(`${routes.dashboard.settings}/`)
  );
}

function mobileInactive() {
  return cn(
    "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  );
}

export function DashboardHeader() {
  const t = useTranslations("Dashboard.header");
  const tNav = useTranslations("Dashboard.sidebar");
  const tSettingsNav = useTranslations("Dashboard.settingsNav");
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const accentSlice = useDashboardAppearanceStore(
    useShallow((s) => ({
      accentKind: s.accentKind,
      accent: s.accent,
      customAccentHex: s.customAccentHex,
    })),
  );
  const resolved = resolveDashboardAccent(accentSlice);
  const { logout, isLoggingOut } = useLogout();
  const settingsMode = isSettingsArea(pathname);
  const sidebarOpen = useDashboardSidebarStore((s) => s.sidebarOpen);
  const toggleSidebar = useDashboardSidebarStore((s) => s.toggleSidebar);

  const initials =
    user?.username?.slice(0, 2).toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "U";

  const projectsHref = routes.dashboard.projects;
  const appearanceHref = routes.dashboard.settingsAppearance;
  const projectsActive =
    pathname === projectsHref || pathname.startsWith(`${projectsHref}/`);
  const appearanceActive =
    pathname === appearanceHref || pathname.startsWith(`${appearanceHref}/`);

  return (
    <header className="sticky top-0 z-20 flex h-auto shrink-0 flex-col border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div
        className="h-0.5 w-full shrink-0 bg-[color:var(--dash-accent)]"
        aria-hidden
      />
      <div className="flex h-14 items-center justify-between gap-2 px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => toggleSidebar()}
            className={cn(
              "hidden size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm transition",
              "hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
              "outline-none focus-visible:ring-2 focus-visible:ring-slate-200 dark:focus-visible:ring-slate-700",
              "md:inline-flex",
            )}
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-sidebar"
            title={t("toggleSidebar")}
            aria-label={t("toggleSidebar")}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" strokeWidth={1.75} aria-hidden />
            ) : (
              <PanelLeft className="size-4" strokeWidth={1.75} aria-hidden />
            )}
          </button>

          {settingsMode ? (
            <Link
              href={projectsHref}
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition",
                "hover:bg-red-100 dark:border-red-900/55 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/80",
                "outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:focus-visible:ring-red-800",
                "sm:text-sm",
              )}
            >
              {t("closeSettings")}
            </Link>
          ) : null}

          <div className="hidden min-w-0 flex-1 md:block">
            <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--dash-accent)]">
              {settingsMode ? t("eyebrowSettings") : t("eyebrowMain")}
            </p>
          </div>

          {!settingsMode ? (
            <div className="flex flex-1 justify-center md:hidden">
              <DashboardAppBrand />
            </div>
          ) : (
            <div className="flex flex-1 md:hidden" aria-hidden />
          )}
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-3">
          {user?.email ? (
            <span className="hidden max-w-[200px] truncate text-sm font-medium text-slate-800 dark:text-slate-200 lg:inline">
              {user.email}
            </span>
          ) : null}
          <Link
            href={appearanceHref}
            title={t("openSettings")}
            aria-label={t("openSettings")}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm transition",
              "hover:border-[color:var(--dash-accent)] hover:bg-slate-50 hover:text-[color:var(--dash-accent)]",
              "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800",
              settingsMode &&
                "border-transparent bg-[color:var(--dash-accent)] text-white shadow-md hover:opacity-90 dark:hover:opacity-90",
            )}
            aria-current={settingsMode ? "page" : undefined}
          >
            <Settings className="size-4" strokeWidth={1.75} aria-hidden />
          </Link>
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            title={user?.email ?? undefined}
          >
            {initials}
          </div>
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            loading={isLoggingOut}
            onClick={() => void logout()}
            className="hidden shrink-0 gap-1.5 text-slate-800 hover:bg-slate-100 sm:inline-flex dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut className="size-3.5" strokeWidth={1.75} />
            {t("signOut")}
          </AppButton>
        </div>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto border-t border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-950 md:hidden"
        aria-label="Mobile"
      >
        {settingsMode ? (
          <Link
            href={appearanceHref}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
              appearanceActive ? resolved.navActiveClassName : mobileInactive(),
            )}
            style={appearanceActive ? resolved.navActiveStyle : undefined}
          >
            <Palette className="size-3.5" strokeWidth={1.75} />
            {tSettingsNav("appearance")}
          </Link>
        ) : (
          <Link
            href={projectsHref}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
              projectsActive ? resolved.navActiveClassName : mobileInactive(),
            )}
            style={projectsActive ? resolved.navActiveStyle : undefined}
          >
            <FolderKanban className="size-3.5" strokeWidth={1.75} />
            {tNav("projects")}
          </Link>
        )}
        <AppButton
          type="button"
          variant="ghost"
          size="sm"
          loading={isLoggingOut}
          onClick={() => void logout()}
          className="ml-auto shrink-0 gap-1 text-slate-800 dark:text-slate-200"
        >
          <LogOut className="size-3.5" strokeWidth={1.75} />
          {t("signOut")}
        </AppButton>
      </nav>
    </header>
  );
}
