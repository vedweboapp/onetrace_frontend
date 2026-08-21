"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { BookOpen, BookUser, Building2, CalendarDays, ShieldCheck, ChevronRight, ClipboardList, Plug, Settings, FileText, FolderKanban, Home, Layers, ListTodo, MapPinHouse, Package, Palette, QrCode, Receipt, RotateCcw, Store, Truck, UserRound } from "lucide-react";
import { isCustomizationSettingsPath } from "@/shared/config/customization-settings-nav";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { useDashboardAppearanceStore } from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";
import { resolveDashboardAccent } from "@/features/dashboard/utils/accent-resolve.util";
import {
  JOB_CATEGORY,
  parseJobCategoryParam,
} from "@/features/jobs/constants/job-category";
import {
  isProjectQuoteCategory,
  isServiceQuoteCategory,
  parseQuoteCategoryParam,
} from "@/features/quotations/constants/quotation-category";
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
  const sidebarLayout = useDashboardAppearanceStore((s) => s.sidebarLayout);
  const resolved = resolveDashboardAccent(accentSlice);
  const sidebarExpanded = useDashboardSidebarStore((s) => s.sidebarOpen);
  const isBoron = sidebarLayout === "boron";
  const isHydrogen = sidebarLayout === "hydrogen";

  const shell = cn(
    "hidden h-full min-h-0 shrink-0 flex-col overflow-hidden bg-slate-50/80 dark:bg-slate-950",
    isBoron
      ? "border-l border-slate-200/90 dark:border-slate-800"
      : "border-r border-slate-200/90 dark:border-slate-800",
    // Hydrogen = top nav: keep sidebar for mobile only
    isHydrogen ? "md:hidden" : "md:flex",
    "transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
    sidebarExpanded ? "md:w-56" : "md:w-14",
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
    "text-slate-700 hover:bg-slate-200/70 hover:text-slate-950",
    "dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
  );
}

/** Soft section/parent active — used when a nested child is selected (no solid filled block). */
function navParentActive() {
  return cn(
    "bg-[color:var(--dash-accent,#0f766e)]/[0.08] font-semibold text-[color:var(--dash-accent,#0f766e)]",
    "dark:bg-[color:var(--dash-accent,#2dd4bf)]/12 dark:text-[color:var(--dash-accent,#5eead4)]",
  );
}

/** Leaf / submenu item active — quiet accent tint (not a solid color block). */
function navLeafActive() {
  return cn(
    "bg-[color:var(--dash-accent,#0f766e)]/[0.14] font-semibold text-[color:var(--dash-accent,#0f766e)]",
    "dark:bg-[color:var(--dash-accent,#2dd4bf)]/20 dark:text-[color:var(--dash-accent,#5eead4)]",
  );
}

function SidebarNavLink({
  href,
  active,
  label,
  icon: Icon,
  expanded,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: LucideIcon;
  expanded: boolean;
  /** Kept for call-site consistency; leaf items use soft active styles. */
  resolved?: ReturnType<typeof resolveDashboardAccent>;
}) {
  return (
    <Link
      href={href}
      title={expanded ? undefined : label}
      className={cn(
        "flex items-center rounded-lg text-sm font-medium transition",
        expanded ? "gap-3 px-3 py-2" : "mx-auto size-10 justify-center p-0",
        active ? navLeafActive() : navInactive(),
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0",
          active ? "opacity-100" : "text-slate-500 dark:text-slate-400",
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      {expanded ? <span className="truncate">{label}</span> : <span className="sr-only">{label}</span>}
    </Link>
  );
}

type SidebarNestedItem = {
  href: string;
  label: string;
  active: boolean;
};

function SidebarNestedNav({
  label,
  icon: Icon,
  active,
  expanded,
  resolved,
  items,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  expanded: boolean;
  resolved: ReturnType<typeof resolveDashboardAccent>;
  items: SidebarNestedItem[];
}) {
  const childActive = items.some((item) => item.active);
  const [open, setOpen] = React.useState(childActive);

  React.useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  // Collapsed rail: keep a compact hover menu so children stay reachable.
  if (!expanded) {
    return (
      <SidebarCollapsedFlyout
        label={label}
        icon={Icon}
        active={active}
        resolved={resolved}
        items={items}
      />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
          active ? navParentActive() : navInactive(),
        )}
      >
        <Icon
          className={cn(
            "size-[18px] shrink-0",
            active ? "opacity-100" : "text-slate-500 dark:text-slate-400",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-90",
            active && "text-[color:var(--dash-accent,#0f766e)]/70",
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            role="group"
            aria-label={label}
            className="mb-1 ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-slate-200/90 pl-2.5 dark:border-slate-700"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[13px] font-medium tracking-tight transition",
                  item.active
                    ? navLeafActive()
                    : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                )}
              >
                <span className="block truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarCollapsedFlyout({
  label,
  icon: Icon,
  active,
  items,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  resolved?: ReturnType<typeof resolveDashboardAccent>;
  items: SidebarNestedItem[];
}) {
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const sidebarLayout = useDashboardAppearanceStore((s) => s.sidebarLayout);
  const openToLeft = sidebarLayout === "boron";

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const updatePos = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = 160;
    setPos({
      top: rect.top,
      left: openToLeft ? Math.max(8, rect.left - menuWidth - 8) : rect.right + 8,
    });
  }, [openToLeft]);

  const openMenu = React.useCallback(() => {
    clearCloseTimer();
    updatePos();
    setOpen(true);
  }, [clearCloseTimer, updatePos]);

  const scheduleClose = React.useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  }, [clearCloseTimer]);

  React.useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePos();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePos]);

  React.useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "mx-auto flex size-10 items-center justify-center rounded-lg text-sm font-medium transition",
          active ? navParentActive() : navInactive(),
        )}
      >
        <Icon
          className={cn(
            "size-[18px] shrink-0",
            active ? "opacity-100" : "text-slate-500 dark:text-slate-400",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="sr-only">{label}</span>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
          <div
            role="menu"
            aria-label={label}
            className={cn(
              "fixed z-[80] w-[10rem] rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-lg",
              "ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10",
            )}
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            <p className="truncate px-2.5 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[13px] font-medium tracking-tight transition",
                    item.active
                      ? navLeafActive()
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white",
                  )}
                >
                  <span className="block truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>,
          document.body,
        )
        : null}
    </div>
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
  const searchParams = useSearchParams();
  const clientsHref = routes.dashboard.clients;
  const vendorsHref = routes.dashboard.vendors;
  const contactsHref = routes.dashboard.contacts;
  const contactClientHref = routes.dashboard.contactClient;
  const contactVendorHref = routes.dashboard.contactVendor;
  const sitesHref = routes.dashboard.sites;
  const quotationsHref = routes.dashboard.quotations;
  const quotationServiceHref = routes.dashboard.quotationService;
  const quotationProjectHref = routes.dashboard.quotationProject;
  const invoicesHref = routes.dashboard.invoices;
  const purchaseOrdersHref = routes.dashboard.purchaseOrders;
  const jobsHref = routes.dashboard.jobs;
  const schedulingHref = routes.dashboard.scheduling;
  const qrCodesHref = routes.dashboard.qrCodes;
  const homeHref = routes.dashboard.root;
  const projectsHref = routes.dashboard.projects;
  const groupsHref = routes.dashboard.groups;
  const materialRequestsHref = routes.dashboard.materialRequests;
  const dispatchesHref = routes.dashboard.dispatches;
  const returnToStockHref = routes.dashboard.returnToStock;
  const itemsHref = routes.dashboard.items;
  const compositeHref = routes.dashboard.compositeItems;
  const homeActive = pathname === homeHref;
  const clientsActive =
    pathname === clientsHref || pathname.startsWith(`${clientsHref}/`);
  const vendorsActive =
    pathname === vendorsHref || pathname.startsWith(`${vendorsHref}/`);
  const contactsActive =
    pathname === contactsHref || pathname.startsWith(`${contactsHref}/`);
  const contactTypeParam = contactsActive
    ? (searchParams.get("contact_type") ?? "").toLowerCase()
    : "";
  const contactClientActive =
    contactsActive && contactTypeParam !== "vendor";
  const contactVendorActive = contactsActive && contactTypeParam === "vendor";
  const sitesActive = pathname === sitesHref || pathname.startsWith(`${sitesHref}/`);
  const quotationsActive =
    pathname === quotationsHref || pathname.startsWith(`${quotationsHref}/`);
  const quoteCategory = React.useMemo(() => {
    if (!quotationsActive) return undefined;
    return parseQuoteCategoryParam(searchParams.get("quote_category"));
  }, [quotationsActive, searchParams]);
  const quotationServiceActive =
    quotationsActive &&
    (quoteCategory == null
      ? pathname === quotationsHref
      : isServiceQuoteCategory(quoteCategory));
  const quotationProjectActive =
    quotationsActive && isProjectQuoteCategory(quoteCategory);
  const invoicesActive =
    pathname === invoicesHref || pathname.startsWith(`${invoicesHref}/`);
  const purchaseOrdersActive =
    pathname === purchaseOrdersHref || pathname.startsWith(`${purchaseOrdersHref}/`);
  const jobsActive = pathname === jobsHref || pathname.startsWith(`${jobsHref}/`);
  const schedulingActive =
    pathname === schedulingHref || pathname.startsWith(`${schedulingHref}/`);
  const qrCodesActive = pathname === qrCodesHref || pathname.startsWith(`${qrCodesHref}/`);
  const projectsActive =
    pathname === projectsHref || pathname.startsWith(`${projectsHref}/`);
  const groupsActive = pathname === groupsHref || pathname.startsWith(`${groupsHref}/`);
  const materialRequestsActive =
    pathname === materialRequestsHref || pathname.startsWith(`${materialRequestsHref}/`);
  const dispatchesActive =
    pathname === dispatchesHref || pathname.startsWith(`${dispatchesHref}/`);
  const returnToStockActive =
    pathname === returnToStockHref || pathname.startsWith(`${returnToStockHref}/`);
  const itemsActive = pathname === itemsHref || pathname.startsWith(`${itemsHref}/`);
  const compositeActive = pathname === compositeHref || pathname.startsWith(`${compositeHref}/`);
  const itemsSectionActive = itemsActive || compositeActive;
  const serviceJobHref = `${routes.dashboard.jobs}?job_category=${JOB_CATEGORY.service}`;
  const projectJobHref = `${routes.dashboard.jobs}?job_category=${JOB_CATEGORY.project}`;
  const jobCategory = jobsActive ? parseJobCategoryParam(searchParams.get("job_category")) : undefined;
  const serviceJobActive =
    jobsActive &&
    (jobCategory == null ? pathname === routes.dashboard.jobs : jobCategory === JOB_CATEGORY.service);
  const projectJobActive = jobsActive && jobCategory === JOB_CATEGORY.project;

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-10 flex h-14 min-w-0 shrink-0 items-center overflow-hidden border-b border-slate-200/90 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950",
          expanded ? "px-4" : "justify-center px-0",
        )}
      >
        <DashboardAppBrand collapsed={!expanded} />
      </div>
      <nav
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain",
          expanded ? "gap-0.5 p-2.5 pb-8" : "items-center gap-1.5 px-1.5 py-3 pb-8",
        )}
      >
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
          href={vendorsHref}
          active={vendorsActive}
          label={t("vendors")}
          icon={Store}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNestedNav
          label={t("contacts")}
          icon={BookUser}
          active={contactsActive}
          expanded={expanded}
          resolved={resolved}
          items={[
            {
              href: contactClientHref,
              label: t("flyoutClient"),
              active: contactClientActive,
            },
            {
              href: contactVendorHref,
              label: t("flyoutVendor"),
              active: contactVendorActive,
            },
          ]}
        />
        <SidebarNavLink
          href={sitesHref}
          active={sitesActive}
          label={t("sites")}
          icon={MapPinHouse}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNestedNav
          label={t("quotations")}
          icon={FileText}
          active={quotationsActive}
          expanded={expanded}
          resolved={resolved}
          items={[
            {
              href: quotationServiceHref,
              label: t("flyoutService"),
              active: quotationServiceActive,
            },
            {
              href: quotationProjectHref,
              label: t("flyoutProject"),
              active: quotationProjectActive,
            },
          ]}
        />
        <SidebarNavLink
          href={invoicesHref}
          active={invoicesActive}
          label={t("invoices")}
          icon={Receipt}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={purchaseOrdersHref}
          active={purchaseOrdersActive}
          label={t("purchaseOrders")}
          icon={ClipboardList}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNestedNav
          label={t("jobs")}
          icon={ListTodo}
          active={jobsActive}
          expanded={expanded}
          resolved={resolved}
          items={[
            {
              href: serviceJobHref,
              label: t("flyoutService"),
              active: serviceJobActive,
            },
            {
              href: projectJobHref,
              label: t("flyoutProject"),
              active: projectJobActive,
            },
          ]}
        />
        <SidebarNavLink
          href={schedulingHref}
          active={schedulingActive}
          label={t("scheduling")}
          icon={CalendarDays}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={qrCodesHref}
          active={qrCodesActive}
          label={t("qrCodes")}
          icon={QrCode}
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
        <SidebarNavLink
          href={materialRequestsHref}
          active={materialRequestsActive}
          label={t("materialRequests")}
          icon={ClipboardList}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={dispatchesHref}
          active={dispatchesActive}
          label={t("dispatches")}
          icon={Truck}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={returnToStockHref}
          active={returnToStockActive}
          label={t("returnToStock")}
          icon={RotateCcw}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNestedNav
          label={t("products")}
          icon={Package}
          active={itemsSectionActive}
          expanded={expanded}
          resolved={resolved}
          items={[
            {
              href: itemsHref,
              label: t("itemsPlain"),
              active: itemsActive,
            },
            {
              href: compositeHref,
              label: t("compositeItems"),
              active: compositeActive,
            },
          ]}
        />
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
  const customizationHref = routes.dashboard.settingsCustomization;
  const usersHref = routes.dashboard.settingsUsers;
  const userGroupsHref = routes.dashboard.settingsUserGroups;
  const rolesHref = routes.dashboard.settingsRoles;
  const profilesHref = routes.dashboard.settingsProfiles;
  const personalProfileHref = routes.dashboard.settingsPersonalProfile;
  const companySettingsHref = routes.dashboard.settingsCompanySettings;
  const modulesHref = routes.dashboard.settingsModules;
  const projectFormsHref = routes.dashboard.settingsProjectForms;
  const integrationsHref = routes.dashboard.settingsIntegrations;

  const customizationActive = isCustomizationSettingsPath(pathname);

  const usersActive =
    pathname === usersHref ||
    pathname.startsWith(`${usersHref}/`) ||
    pathname === userGroupsHref ||
    pathname.startsWith(`${userGroupsHref}/`);
  const rolesActive =
    pathname === rolesHref || pathname.startsWith(`${rolesHref}/`);
  const profilesActive =
    pathname === profilesHref || pathname.startsWith(`${profilesHref}/`);
  const personalProfileActive =
    pathname === personalProfileHref || pathname.startsWith(`${personalProfileHref}/`);
  const companySettingsActive =
    pathname === companySettingsHref || pathname.startsWith(`${companySettingsHref}/`);
  const modulesActive = pathname === modulesHref || pathname.startsWith(`${modulesHref}/`);
  const projectFormsActive = pathname === projectFormsHref || pathname.startsWith(`${projectFormsHref}/`);
  const integrationsActive =
    pathname === integrationsHref || pathname.startsWith(`${integrationsHref}/`);

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-10 flex h-14 min-w-0 shrink-0 items-center overflow-hidden border-b border-slate-200/90 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950",
          expanded ? "px-4" : "justify-center px-0",
        )}
      >
        <DashboardAppBrand collapsed={!expanded} />
      </div>
      <nav
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain",
          expanded ? "gap-0.5 p-2.5 pb-8" : "items-center gap-1.5 px-1.5 py-3 pb-8",
        )}
      >
        <SidebarNavLink
          href={personalProfileHref}
          active={personalProfileActive}
          label={t("personalProfile")}
          icon={UserRound}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={companySettingsHref}
          active={companySettingsActive}
          label={t("companySettings")}
          icon={Building2}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={modulesHref}
          active={modulesActive}
          label={t("modules")}
          icon={Settings}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={projectFormsHref}
          active={projectFormsActive}
          label={t("projectForms")}
          icon={FileText}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={customizationHref}
          active={customizationActive}
          label={t("customization.label")}
          icon={Palette}
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
        <SidebarNavLink
          href={rolesHref}
          active={rolesActive}
          label={t("roles")}
          icon={ShieldCheck}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={profilesHref}
          active={profilesActive}
          label={t("profiles")}
          icon={Layers}
          expanded={expanded}
          resolved={resolved}
        />
        <SidebarNavLink
          href={integrationsHref}
          active={integrationsActive}
          label={t("integrations")}
          icon={Plug}
          expanded={expanded}
          resolved={resolved}
        />
      </nav>
    </>
  );
}
