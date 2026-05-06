"use client";

import type { LucideIcon } from "lucide-react";
import { Building2, ChevronRight, FolderKanban, Home, Layers, Package, Palette, Tags } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useDashboardAppearanceStore } from "@/features/dashboard/store/dashboard-appearance.store";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";
import { resolveDashboardAccent } from "@/features/dashboard/utils/accent-resolve.util";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";
import { useShallow } from "zustand/react/shallow";
import { DashboardAppBrand } from "./dashboard-app-brand";

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
  const sidebarExpanded = useDashboardSidebarStore((s) => s.sidebarOpen);

  const shell = cn(
    "hidden h-full min-h-0 shrink-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    "md:flex",
    sidebarExpanded ? "md:w-64" : "md:w-[52px]",
  );

  if (isSettingsArea(pathname)) {
    return (
      <aside id="dashboard-sidebar" className={shell}>
        <DashboardSettingsSidebar resolved={resolved} expanded={sidebarExpanded} />
      </aside>
    );
  }

  return (
    <aside id="dashboard-sidebar" className={shell}>
      <DashboardMainSidebar resolved={resolved} expanded={sidebarExpanded} />
    </aside>
  );
}

function navInactive() {
  return cn(
    "text-slate-800 hover:bg-slate-100 hover:text-slate-950",
    "dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white",
  );
}

function SidebarNavLink({
  href,
  active,
  label,
  icon: Icon,
  expanded,
  resolved,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: LucideIcon;
  expanded: boolean;
  resolved: ReturnType<typeof resolveDashboardAccent>;
}) {
  return (
    <Link
      href={href}
      title={expanded ? undefined : label}
      className={cn(
        "flex items-center rounded-lg text-sm font-medium transition",
        expanded ? "gap-3 px-3 py-2.5" : "mx-auto size-9 justify-center p-0",
        active ? resolved.navActiveClassName : navInactive(),
      )}
      style={active ? resolved.navActiveStyle : undefined}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0",
          active ? "opacity-95" : "text-slate-600 dark:text-slate-300",
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      {expanded ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </Link>
  );
}

function SidebarSubNavLink({
  href,
  active,
  label,
  expanded,
  resolved,
}: {
  href: string;
  active: boolean;
  label: string;
  expanded: boolean;
  resolved: ReturnType<typeof resolveDashboardAccent>;
}) {
  return (
    <Link
      href={href}
      title={expanded ? undefined : label}
      className={cn(
        "flex items-center rounded-lg text-sm font-medium transition",
        expanded ? "gap-2.5 px-3 py-2 pl-10" : "mx-auto size-9 justify-center p-0",
        active ? resolved.navActiveClassName : navInactive(),
      )}
      style={active ? resolved.navActiveStyle : undefined}
    >
      <ChevronRight
        className={cn(
          "size-4 shrink-0",
          active ? "opacity-95" : "text-slate-400 dark:text-slate-500",
        )}
        strokeWidth={2}
        aria-hidden
      />
      {expanded ? <span className="truncate">{label}</span> : <span className="sr-only">{label}</span>}
    </Link>
  );
}

function DashboardMainSidebar({
  resolved,
  expanded,
}: {
  resolved: ReturnType<typeof resolveDashboardAccent>;
  expanded: boolean;
}) {
  const t = useTranslations("Dashboard.sidebar");
  const pathname = usePathname();
  const clientsHref = routes.dashboard.clients;
  const homeHref = routes.dashboard.root;
  const projectsHref = routes.dashboard.projects;
  const groupsHref = routes.dashboard.groups;
  const itemsHref = routes.dashboard.items;
  const compositeHref = routes.dashboard.compositeItems;
  const homeActive = pathname === homeHref;
  const clientsActive =
    pathname === clientsHref || pathname.startsWith(`${clientsHref}/`);
  const projectsActive =
    pathname === projectsHref || pathname.startsWith(`${projectsHref}/`);
  const groupsActive = pathname === groupsHref || pathname.startsWith(`${groupsHref}/`);
  const itemsActive = pathname === itemsHref || pathname.startsWith(`${itemsHref}/`);
  const compositeActive = pathname === compositeHref || pathname.startsWith(`${compositeHref}/`);
  const itemsSectionActive = itemsActive || compositeActive;

  return (
    <>
      <div
        className={cn(
          "flex h-14 min-w-0 shrink-0 items-center overflow-hidden border-b border-slate-200 dark:border-slate-800",
          expanded ? "px-4" : "justify-center px-0",
        )}
      >
        <DashboardAppBrand collapsed={!expanded} />
      </div>
      <nav className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-0.5", expanded ? "p-3" : "items-center px-0 py-3")}>
        <SidebarNavLink
          href={homeHref}
          active={homeActive}
          label={t("home")}
          icon={Home}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={clientsHref}
          active={clientsActive}
          label={t("clients")}
          icon={Building2}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={projectsHref}
          active={projectsActive}
          label={t("projects")}
          icon={FolderKanban}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={groupsHref}
          active={groupsActive}
          label={t("groups")}
          icon={Layers}
          expanded={expanded}
          resolved={resolved}
        />
        {expanded ? (
          <div className="group/items pt-1">
            <SidebarNavLink
              href={itemsHref}
              active={false}
              label={t("items")}
              icon={Package}
              expanded
              resolved={resolved}
            />
            <div
              className={cn(
                "mt-0.5 space-y-0.5 overflow-hidden",
                "max-h-0 opacity-0 transition-all duration-150",
                "group-hover/items:max-h-40 group-hover/items:opacity-100",
                "group-focus-within/items:max-h-40 group-focus-within/items:opacity-100",
                itemsSectionActive && "max-h-40 opacity-100",
              )}
            >
              <SidebarSubNavLink
                href={itemsHref}
                active={itemsActive}
                label={t("itemsPlain")}
                expanded
                resolved={resolved}
              />
              <SidebarSubNavLink
                href={compositeHref}
                active={compositeActive}
                label={t("compositeItems")}
                expanded
                resolved={resolved}
              />
            </div>
          </div>
        ) : (
          <>
            <SidebarNavLink
              href={itemsHref}
              active={itemsSectionActive}
              label={t("items")}
              icon={Package}
              expanded={expanded}
              resolved={resolved}
            />
          </>
        )}
      </nav>
    </>
  );
}

function DashboardSettingsSidebar({
  resolved,
  expanded,
}: {
  resolved: ReturnType<typeof resolveDashboardAccent>;
  expanded: boolean;
}) {
  const t = useTranslations("Dashboard.settingsNav");
  const pathname = usePathname();
  const appearanceHref = routes.dashboard.settingsAppearance;
  const pinStatusHref = routes.dashboard.settingsPinStatus;

  const appearanceActive =
    pathname === appearanceHref || pathname.startsWith(`${appearanceHref}/`);
  const pinStatusActive =
    pathname === pinStatusHref || pathname.startsWith(`${pinStatusHref}/`);

  return (
    <>
      <div
        className={cn(
          "flex h-14 min-w-0 shrink-0 items-center overflow-hidden border-b border-slate-200 dark:border-slate-800",
          expanded ? "px-4" : "justify-center px-0",
        )}
      >
        <DashboardAppBrand collapsed={!expanded} />
      </div>
      <nav className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-0.5", expanded ? "p-3" : "items-center px-0 py-3")}>
        <SidebarNavLink
          href={appearanceHref}
          active={appearanceActive}
          label={t("appearance")}
          icon={Palette}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={pinStatusHref}
          active={pinStatusActive}
          label={t("pinStatus")}
          icon={Tags}
          expanded={expanded}
          resolved={resolved}
        />
      </nav>
    </>
  );
}
