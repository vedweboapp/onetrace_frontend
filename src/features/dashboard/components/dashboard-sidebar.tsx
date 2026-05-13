"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { BookUser, Building2, FileText, FolderKanban, Home, Layers, MapPinHouse, Package, Palette, Tag, Tags, UserRound } from "lucide-react";
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
    sidebarExpanded ? "md:w-50" : "md:w-[42px]",
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
  subtleActive = false,
}: {
  href: string;
  active: boolean;
  label: string;
  expanded: boolean;
  resolved: ReturnType<typeof resolveDashboardAccent>;
  subtleActive?: boolean;
}) {
  const subtleActiveClassName = cn(
    "bg-slate-100 text-slate-900",
    "dark:bg-slate-800 dark:text-slate-100",
  );

  return (
    <Link
      href={href}
      title={expanded ? undefined : label}
      className={cn(
        "flex items-center rounded-lg border-l-2 text-sm font-medium transition",
        expanded ? "px-3 py-2 pl-8" : "mx-auto size-9 justify-center p-0",
        active ? "border-l-[color:var(--dash-accent)]" : "border-l-transparent",
        active ? (subtleActive ? subtleActiveClassName : resolved.navActiveClassName) : navInactive(),
      )}
      style={active && !subtleActive ? resolved.navActiveStyle : undefined}
    >
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
  const [itemsOpen, setItemsOpen] = React.useState(false);
  const clientsHref = routes.dashboard.clients;
  const contactsHref = routes.dashboard.contacts;
  const sitesHref = routes.dashboard.sites;
  const quotationsHref = routes.dashboard.quotations;
  const homeHref = routes.dashboard.root;
  const projectsHref = routes.dashboard.projects;
  const groupsHref = routes.dashboard.groups;
  const itemsHref = routes.dashboard.items;
  const compositeHref = routes.dashboard.compositeItems;
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
  const itemsActive = pathname === itemsHref || pathname.startsWith(`${itemsHref}/`);
  const compositeActive = pathname === compositeHref || pathname.startsWith(`${compositeHref}/`);
  const itemsSectionActive = itemsActive || compositeActive;

  React.useEffect(() => {
    if (itemsSectionActive) setItemsOpen(true);
  }, [itemsSectionActive]);

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
          href={contactsHref}
          active={contactsActive}
          label={t("contacts")}
          icon={BookUser}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={sitesHref}
          active={sitesActive}
          label={t("sites")}
          icon={MapPinHouse}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={quotationsHref}
          active={quotationsActive}
          label={t("quotations")}
          icon={FileText}
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
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setItemsOpen((v) => !v)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
                itemsSectionActive
                  ? resolved.navActiveClassName
                  : navInactive(),
              )}
              style={itemsSectionActive ? resolved.navActiveStyle : undefined}
              aria-expanded={itemsOpen}
            >
              <Package
                className={cn(
                  "size-[18px] shrink-0",
                  itemsSectionActive ? "opacity-95" : "text-slate-600 dark:text-slate-300",
                )}
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="truncate">{t("products")}</span>
            </button>
            <div
              className={cn(
                "mt-1.5 space-y-1 overflow-hidden",
                "max-h-0 opacity-0 transition-all duration-150",
                itemsOpen && "max-h-40 opacity-100",
              )}
            >
              <SidebarSubNavLink
                href={itemsHref}
                active={itemsActive}
                label={t("itemsPlain")}
                expanded
                resolved={resolved}
                subtleActive
              />
              <SidebarSubNavLink
                href={compositeHref}
                active={compositeActive}
                label={t("compositeItems")}
                expanded
                resolved={resolved}
                subtleActive
              />
            </div>
          </div>
        ) : (
          <>
            <SidebarNavLink
              href={itemsHref}
              active={itemsSectionActive}
              label={t("products")}
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
  const tagHref = routes.dashboard.settingsTags;
  const usersHref = routes.dashboard.settingsUsers;

  const appearanceActive =
    pathname === appearanceHref || pathname.startsWith(`${appearanceHref}/`);
  const pinStatusActive =
    pathname === pinStatusHref || pathname.startsWith(`${pinStatusHref}/`);
  const tagActive =
    pathname === tagHref || pathname.startsWith(`${tagHref}/`);
  const usersActive =
    pathname === usersHref || pathname.startsWith(`${usersHref}/`);

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
        <SidebarNavLink
          href={tagHref}
          active={tagActive}
          label={t("tags")}
          icon={Tag}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={usersHref}
          active={usersActive}
          label={t("users")}
          icon={UserRound}
          expanded={expanded}
          resolved={resolved}
        />
      </nav>
    </>
  );
}
