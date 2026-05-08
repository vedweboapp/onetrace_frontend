"use client";

import {
  Bell,
  BookUser,
  Building2,
  FileText,
  FolderKanban,
  Home,
  Layers,
  MapPinHouse,
  Package,
  Palette,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Tags,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useDashboardAppearanceStore } from "@/features/dashboard/store/dashboard-appearance.store";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";
import { resolveDashboardAccent } from "@/features/dashboard/utils/accent-resolve.util";
import { dashboardContentHorizontalGutterClassName } from "@/shared/config/dashboard-shell";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";
import { useShallow } from "zustand/react/shallow";
import { DashboardAppBrand } from "./dashboard-app-brand";
import { DashboardProfileMenu } from "./dashboard-profile-menu";

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
  const settingsMode = isSettingsArea(pathname);
  const sidebarExpanded = useDashboardSidebarStore((s) => s.sidebarOpen);
  const toggleSidebar = useDashboardSidebarStore((s) => s.toggleSidebar);

  const initials =
    user?.username?.slice(0, 2).toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "U";

  const clientsHref = routes.dashboard.clients;
  const contactsHref = routes.dashboard.contacts;
  const sitesHref = routes.dashboard.sites;
  const quotationsHref = routes.dashboard.quotations;
  const homeHref = routes.dashboard.root;
  const projectsHref = routes.dashboard.projects;
  const groupsHref = routes.dashboard.groups;
  const compositeHref = routes.dashboard.compositeItems;
  const appearanceHref = routes.dashboard.settingsAppearance;
  const pinStatusHref = routes.dashboard.settingsPinStatus;
  const homeActive = pathname === homeHref;
  const clientsActive =
    pathname === clientsHref || pathname.startsWith(`${clientsHref}/`);
  const contactsActive =
    pathname === contactsHref || pathname.startsWith(`${contactsHref}/`);
  const sitesActive = pathname === sitesHref || pathname.startsWith(`${sitesHref}/`);
  const quotationsActive =
    pathname === quotationsHref || pathname.startsWith(`${quotationsHref}/`);
  const projectsActive =
    pathname === projectsHref || pathname.startsWith(`${projectsHref}/`);
  const groupsActive = pathname === groupsHref || pathname.startsWith(`${groupsHref}/`);
  const compositeActive =
    pathname === compositeHref || pathname.startsWith(`${compositeHref}/`);
  const appearanceActive =
    pathname === appearanceHref || pathname.startsWith(`${appearanceHref}/`);
  const pinStatusActive =
    pathname === pinStatusHref || pathname.startsWith(`${pinStatusHref}/`);

  const sectionTitle = settingsMode
    ? t("eyebrowSettings")
    : homeActive
      ? tNav("home")
      : projectsActive
        ? tNav("projects")
        : quotationsActive
          ? tNav("quotations")
          : sitesActive
            ? tNav("sites")
            : contactsActive
              ? tNav("contacts")
              : clientsActive
                ? tNav("clients")
                : groupsActive
                  ? tNav("groups")
                  : compositeActive
                    ? tNav("compositeItems")
                    : tNav("home");

  return (
    <header className="z-20 flex h-auto shrink-0 flex-col border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
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
            aria-expanded={sidebarExpanded}
            aria-controls="dashboard-sidebar"
            title={t("toggleSidebar")}
            aria-label={t("toggleSidebar")}
          >
            {sidebarExpanded ? (
              <PanelLeftClose className="size-4" strokeWidth={1.75} aria-hidden />
            ) : (
              <PanelLeft className="size-4" strokeWidth={1.75} aria-hidden />
            )}
          </button>

        

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{sectionTitle}</p>
          </div>

            {settingsMode ? (
            <Link
              href={homeHref}
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition sm:px-3 sm:text-sm",
                "hover:border-red-300 hover:bg-red-50 dark:border-red-900/70 dark:bg-slate-900 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-950/50",
                "outline-none focus-visible:ring-2 focus-visible:ring-red-200 dark:focus-visible:ring-red-900/60",
              )}
            >
              {t("closeSettings")}
            </Link>
          ) : null}

          {!settingsMode ? (
            <div className="flex flex-1 justify-center md:hidden">
              <DashboardAppBrand />
            </div>
          ) : (
            <div className="flex flex-1 md:hidden" aria-hidden />
          )}
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-3">
          {/* <button
            type="button"
            title={t("notifications")}
            aria-label={t("notifications")}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition",
              "hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
            )}
          >
            <Bell className="size-4" strokeWidth={1.75} />
          </button> */}
          <Link
            href={appearanceHref}
            title={t("openSettings")}
            aria-label={t("openSettings")}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm transition",
              "hover:border-[color:var(--dash-accent)] hover:bg-slate-50 hover:text-[color:var(--dash-accent)]",
              "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              settingsMode &&
                "border-transparent bg-[color:var(--dash-accent)] text-[color:var(--dash-on-accent,#ffffff)] shadow-md hover:opacity-90 dark:hover:opacity-90",
            )}
            aria-current={settingsMode ? "page" : undefined}
          >
            <Settings className="size-4" strokeWidth={1.75} aria-hidden />
          </Link>
          <DashboardProfileMenu initials={initials} />
        </div>
      </div>
      <nav
        className={cn(
          "flex gap-1 overflow-x-auto border-t border-slate-200 bg-white py-2 dark:border-slate-800 dark:bg-slate-950 md:hidden",
          dashboardContentHorizontalGutterClassName,
        )}
        aria-label="Mobile"
      >
        {settingsMode ? (
          <>
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
            <Link
              href={pinStatusHref}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                pinStatusActive ? resolved.navActiveClassName : mobileInactive(),
              )}
              style={pinStatusActive ? resolved.navActiveStyle : undefined}
            >
              <Tags className="size-3.5" strokeWidth={1.75} />
              {tSettingsNav("pinStatus")}
            </Link>
          </>
        ) : (
          <>
            <Link
              href={homeHref}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                homeActive ? resolved.navActiveClassName : mobileInactive(),
              )}
              style={homeActive ? resolved.navActiveStyle : undefined}
            >
              <Home className="size-3.5" strokeWidth={1.75} />
              {tNav("home")}
            </Link>
            <Link
              href={clientsHref}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                clientsActive ? resolved.navActiveClassName : mobileInactive(),
              )}
              style={clientsActive ? resolved.navActiveStyle : undefined}
            >
              <Building2 className="size-3.5" strokeWidth={1.75} />
              {tNav("clients")}
            </Link>
            <Link
              href={contactsHref}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                contactsActive ? resolved.navActiveClassName : mobileInactive(),
              )}
              style={contactsActive ? resolved.navActiveStyle : undefined}
            >
              <BookUser className="size-3.5" strokeWidth={1.75} />
              {tNav("contacts")}
            </Link>
            <Link
              href={sitesHref}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                sitesActive ? resolved.navActiveClassName : mobileInactive(),
              )}
              style={sitesActive ? resolved.navActiveStyle : undefined}
            >
              <MapPinHouse className="size-3.5" strokeWidth={1.75} />
              {tNav("sites")}
            </Link>
            <Link
              href={quotationsHref}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                quotationsActive ? resolved.navActiveClassName : mobileInactive(),
              )}
              style={quotationsActive ? resolved.navActiveStyle : undefined}
            >
              <FileText className="size-3.5" strokeWidth={1.75} />
              {tNav("quotations")}
            </Link>
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
            <Link
              href={groupsHref}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                groupsActive ? resolved.navActiveClassName : mobileInactive(),
              )}
              style={groupsActive ? resolved.navActiveStyle : undefined}
            >
              <Layers className="size-3.5" strokeWidth={1.75} />
              {tNav("groups")}
            </Link>
            <Link
              href={compositeHref}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                compositeActive ? resolved.navActiveClassName : mobileInactive(),
              )}
              style={compositeActive ? resolved.navActiveStyle : undefined}
            >
              <Package className="size-3.5" strokeWidth={1.75} />
              {tNav("compositeItems")}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
