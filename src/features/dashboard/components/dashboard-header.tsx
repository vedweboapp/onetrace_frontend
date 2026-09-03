"use client";

import {
  BookUser,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderKanban,
  Home,
  Layers,
  ListTodo,
  MapPinHouse,
  Package,
  Palette,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Plug,
  QrCode,
  Receipt,
  RotateCcw,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isCustomizationSettingsPath } from "@/shared/config/customization-settings-nav";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useDashboardAppearanceStore } from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";
import { resolveDashboardAccent } from "@/features/dashboard/utils/accent-resolve.util";
import { dashboardContentHorizontalGutterClassName } from "@/shared/config/dashboard-shell";
import {
  JOB_CATEGORY,
  parseJobCategoryParam,
} from "@/features/jobs/constants/job-category";
import {
  isProjectQuoteCategory,
  isServiceQuoteCategory,
  parseQuoteCategoryFromBackParam,
  parseQuoteCategoryParam,
} from "@/features/quotations/constants/quotation-category";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";
import { useShallow } from "zustand/react/shallow";
import { DashboardAppBrand } from "./dashboard-app-brand";
import { DashboardProfileMenu } from "./dashboard-profile-menu";
import { TopNavGroup, TopNavLink } from "./dashboard-top-nav";

function isSettingsArea(pathname: string) {
  return (
    pathname === routes.dashboard.settings ||
    pathname.startsWith(`${routes.dashboard.settings}/`)
  );
}

export function DashboardHeader() {
  const t = useTranslations("Dashboard.header");
  const tNav = useTranslations("Dashboard.sidebar");
  const tSettingsNav = useTranslations("Dashboard.settingsNav");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const accentSlice = useDashboardAppearanceStore(
    useShallow((s) => ({
      accentKind: s.accentKind,
      accent: s.accent,
      customAccentHex: s.customAccentHex,
    })),
  );
  const sidebarLayout = useDashboardAppearanceStore((s) => s.sidebarLayout);
  const isHydrogen = sidebarLayout === "hydrogen";
  const isBoron = sidebarLayout === "boron";
  const resolved = resolveDashboardAccent(accentSlice);
  const settingsMode = isSettingsArea(pathname);
  const sidebarExpanded = useDashboardSidebarStore((s) => s.sidebarOpen);
  const toggleSidebar = useDashboardSidebarStore((s) => s.toggleSidebar);

  const initials = (() => {
    const first = user?.first_name?.trim()?.[0];
    const last = user?.last_name?.trim()?.[0];
    if (first && last) return `${first}${last}`.toUpperCase();
    if (first) return first.toUpperCase();
    const u = user?.username?.trim() ?? "";
    const email = user?.email?.trim() ?? "";
    if (u && u.toLowerCase() !== email.toLowerCase() && !u.includes("@")) {
      return u.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase() || "U";
  })();

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
  const serviceJobHref = `${jobsHref}?job_category=${JOB_CATEGORY.service}`;
  const projectJobHref = `${jobsHref}?job_category=${JOB_CATEGORY.project}`;
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
  const personalProfileHref = routes.dashboard.settingsPersonalProfile;
  const companySettingsHref = routes.dashboard.settingsCompanySettings;
  const modulesHref = routes.dashboard.settingsModules;
  const customizationHref = routes.dashboard.settingsCustomization;
  const pinStatusHref = routes.dashboard.settingsPinStatus;
  const projectStatusHref = routes.dashboard.settingsProjectStatus;
  const jobStatusHref = routes.dashboard.settingsJobStatus;
  const materialStatusHref = routes.dashboard.settingsMaterialStatus;
  const tagHref = routes.dashboard.settingsTags;
  const projectTypeHref = routes.dashboard.settingsProjectTypes;
  const installationTypeHref = routes.dashboard.settingsInstallationTypes;
  const vendorTypeHref = routes.dashboard.settingsVendorTypes;
  const unitTypeHref = routes.dashboard.settingsUnitTypes;
  const rejectionReasonHref = routes.dashboard.settingsRejectionReasons;
  const checklistTypeHref = routes.dashboard.settingsChecklistTypes;
  const titleHref = routes.dashboard.settingsTitle;
  const projectFormsHref = routes.dashboard.settingsProjectForms;
  const usersHref = routes.dashboard.settingsUsers;
  const userGroupsHref = routes.dashboard.settingsUserGroups;
  const rolesHref = routes.dashboard.settingsRoles;
  const profilesHref = routes.dashboard.settingsProfiles;
  const integrationsHref = routes.dashboard.settingsIntegrations;

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
  const contactClientActive = contactsActive && contactTypeParam !== "vendor";
  const contactVendorActive = contactsActive && contactTypeParam === "vendor";
  const sitesActive = pathname === sitesHref || pathname.startsWith(`${sitesHref}/`);
  const quotationsActive =
    pathname === quotationsHref || pathname.startsWith(`${quotationsHref}/`);
  const quoteCategory = quotationsActive
    ? parseQuoteCategoryParam(searchParams.get("quote_category")) ??
      parseQuoteCategoryFromBackParam(searchParams.get("back"))
    : undefined;
  const quotationServiceActive =
    quotationsActive &&
    (quoteCategory == null
      ? pathname === quotationsHref
      : isServiceQuoteCategory(quoteCategory));
  const quotationProjectActive = quotationsActive && isProjectQuoteCategory(quoteCategory);
  const invoicesActive =
    pathname === invoicesHref || pathname.startsWith(`${invoicesHref}/`);
  const purchaseOrdersActive =
    pathname === purchaseOrdersHref || pathname.startsWith(`${purchaseOrdersHref}/`);
  const jobsActive = pathname === jobsHref || pathname.startsWith(`${jobsHref}/`);
  const jobCategory = jobsActive ? parseJobCategoryParam(searchParams.get("job_category")) : undefined;
  const serviceJobActive =
    jobsActive &&
    (jobCategory == null ? pathname === jobsHref : jobCategory === JOB_CATEGORY.service);
  const projectJobActive = jobsActive && jobCategory === JOB_CATEGORY.project;
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
  const compositeActive =
    pathname === compositeHref || pathname.startsWith(`${compositeHref}/`);
  const itemsSectionActive = itemsActive || compositeActive;
  const personalProfileActive =
    pathname === personalProfileHref || pathname.startsWith(`${personalProfileHref}/`);
  const companySettingsActive =
    pathname === companySettingsHref || pathname.startsWith(`${companySettingsHref}/`);
  const modulesActive =
    pathname === modulesHref || pathname.startsWith(`${modulesHref}/`);
  const pinStatusActive =
    pathname === pinStatusHref || pathname.startsWith(`${pinStatusHref}/`);
  const projectStatusActive =
    pathname === projectStatusHref || pathname.startsWith(`${projectStatusHref}/`);
  const jobStatusActive =
    pathname === jobStatusHref || pathname.startsWith(`${jobStatusHref}/`);
  const materialStatusActive =
    pathname === materialStatusHref || pathname.startsWith(`${materialStatusHref}/`);
  const tagActive = pathname === tagHref || pathname.startsWith(`${tagHref}/`);
  const projectTypeActive =
    pathname === projectTypeHref || pathname.startsWith(`${projectTypeHref}/`);
  const installationTypeActive =
    pathname === installationTypeHref || pathname.startsWith(`${installationTypeHref}/`);
  const vendorTypeActive =
    pathname === vendorTypeHref || pathname.startsWith(`${vendorTypeHref}/`);
  const unitTypeActive =
    pathname === unitTypeHref || pathname.startsWith(`${unitTypeHref}/`);
  const rejectionReasonActive =
    pathname === rejectionReasonHref || pathname.startsWith(`${rejectionReasonHref}/`);
  const checklistTypeActive =
    pathname === checklistTypeHref || pathname.startsWith(`${checklistTypeHref}/`);
  const titleActive = pathname === titleHref || pathname.startsWith(`${titleHref}/`);
  const projectFormsActive =
    pathname === projectFormsHref || pathname.startsWith(`${projectFormsHref}/`);
  const customizationHubActive =
    pathname === customizationHref || pathname.startsWith(`${customizationHref}/`);
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
  const integrationsActive =
    pathname === integrationsHref || pathname.startsWith(`${integrationsHref}/`);

  const sectionTitle = homeActive
    ? tNav("home")
    : projectsActive
      ? tNav("projects")
      : quotationsActive
        ? quotationProjectActive
          ? tNav("quotationProject")
          : quotationServiceActive
            ? tNav("quotationService")
            : tNav("quotations")
        : invoicesActive
          ? tNav("invoices")
          : purchaseOrdersActive
            ? tNav("purchaseOrders")
            : clientsActive
              ? tNav("clients")
              : vendorsActive
                ? tNav("vendors")
                : contactsActive
                  ? contactVendorActive
                    ? tNav("contactVendor")
                    : tNav("contactClient")
                  : sitesActive
                    ? tNav("sites")
                    : jobsActive
                      ? projectJobActive
                        ? tNav("projectJob")
                        : tNav("serviceJob")
                      : schedulingActive
                        ? tNav("scheduling")
                        : qrCodesActive
                        ? tNav("qrCodes")
                        : groupsActive
                          ? tNav("groups")
                          : materialRequestsActive
                            ? tNav("materialRequests")
                            : dispatchesActive
                              ? tNav("dispatches")
                              : returnToStockActive
                                ? tNav("returnToStock")
                                : compositeActive
                                  ? tNav("compositeItems")
                                  : itemsActive
                                    ? tNav("itemsPlain")
                                    : personalProfileActive
                                      ? tSettingsNav("personalProfile")
                                      : companySettingsActive
                                        ? tSettingsNav("companySettings")
                                        : modulesActive
                                          ? tSettingsNav("modules")
                                          : customizationHubActive
                                            ? tSettingsNav("customization.label")
                                            : pinStatusActive
                                              ? tSettingsNav("pinStatus")
                                              : projectStatusActive
                                                ? tSettingsNav("projectStatus")
                                                : jobStatusActive
                                                  ? tSettingsNav("jobStatus")
                                                  : materialStatusActive
                                                    ? tSettingsNav("materialStatus")
                                                    : tagActive
                                                      ? tSettingsNav("tags")
                                                      : installationTypeActive
                                                        ? tSettingsNav("installationTypes")
                                                        : vendorTypeActive
                                                          ? tSettingsNav("vendorTypes")
                                                          : unitTypeActive
                                                            ? tSettingsNav("unitTypes")
                                                            : rejectionReasonActive
                                                              ? tSettingsNav("rejectionReasons")
                                                              : checklistTypeActive
                                                                ? tSettingsNav("checklistTypes")
                                                                : titleActive
                                                                  ? tSettingsNav("titles")
                                                                  : projectTypeActive
                                                                    ? tSettingsNav("projectTypes")
                                                                    : usersActive
                                                                      ? tSettingsNav("users")
                                                                      : rolesActive
                                                                        ? tSettingsNav("roles")
                                                                        : profilesActive
                                                                          ? tSettingsNav("profiles")
                                                                          : integrationsActive
                                                                            ? tSettingsNav("integrations")
                                                                            : projectFormsActive
                                                                              ? tSettingsNav("projectForms")
                                                                              : tNav("home");

  const sidebarToggle = !isHydrogen ? (
    <button
      type="button"
      onClick={() => toggleSidebar()}
      className={cn(
        "hidden size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm transition md:inline-flex",
        "hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
        "outline-none focus-visible:ring-2 focus-visible:ring-slate-200 dark:focus-visible:ring-slate-700",
      )}
      aria-expanded={sidebarExpanded}
      aria-controls="dashboard-sidebar"
      title={t("toggleSidebar")}
      aria-label={t("toggleSidebar")}
    >
      {isBoron ? (
        sidebarExpanded ? (
          <PanelRightClose className="size-4" strokeWidth={1.75} aria-hidden />
        ) : (
          <PanelRight className="size-4" strokeWidth={1.75} aria-hidden />
        )
      ) : sidebarExpanded ? (
        <PanelLeftClose className="size-4" strokeWidth={1.75} aria-hidden />
      ) : (
        <PanelLeft className="size-4" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  ) : null;

  return (
    <header className="flex h-auto shrink-0 flex-col bg-white dark:bg-slate-950">
      <div className="flex h-14 items-center justify-between gap-2 px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          {!isBoron ? sidebarToggle : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {sectionTitle}
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
          {settingsMode ? (
            <Link
              href={homeHref}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition sm:px-3",
                "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
                "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                "outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                "dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-950",
              )}
            >
              <X className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <span className="hidden sm:inline">{t("closeSettings")}</span>
              <span className="sm:hidden">{t("closeSettingsShort")}</span>
            </Link>
          ) : (
            <Link
              href={personalProfileHref}
              title={t("openSettings")}
              aria-label={t("openSettings")}
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition",
                "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
                "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                "outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                "dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-950",
              )}
            >
              <Settings className="size-4" strokeWidth={1.75} aria-hidden />
            </Link>
          )}
          <DashboardProfileMenu initials={initials} />
          {isBoron ? sidebarToggle : null}
        </div>
      </div>

      <nav
        className={cn(
          "scrollbar-hide flex gap-1 overflow-x-auto overflow-y-visible border-t border-slate-200 bg-white py-2 dark:border-slate-800 dark:bg-slate-950",
          isHydrogen ? "md:flex" : "md:hidden",
          dashboardContentHorizontalGutterClassName,
        )}
        aria-label={isHydrogen ? "Primary" : "Mobile"}
      >
        {settingsMode ? (
          <>
            <TopNavLink href={personalProfileHref} label={tSettingsNav("personalProfile")} icon={UserRound} active={personalProfileActive} resolved={resolved} />
            <TopNavLink href={companySettingsHref} label={tSettingsNav("companySettings")} icon={Building2} active={companySettingsActive} resolved={resolved} />
            <TopNavLink href={modulesHref} label={tSettingsNav("modules")} icon={Settings} active={modulesActive} resolved={resolved} />
            <TopNavLink href={projectFormsHref} label={tSettingsNav("projectForms")} icon={FileText} active={projectFormsActive} resolved={resolved} />
            <TopNavLink href={customizationHref} label={tSettingsNav("customization.label")} icon={Palette} active={customizationActive} resolved={resolved} />
            <TopNavLink href={usersHref} label={tSettingsNav("users")} icon={UserRound} active={usersActive} resolved={resolved} />
            <TopNavLink href={rolesHref} label={tSettingsNav("roles")} icon={ShieldCheck} active={rolesActive} resolved={resolved} />
            <TopNavLink href={profilesHref} label={tSettingsNav("profiles")} icon={Layers} active={profilesActive} resolved={resolved} />
            <TopNavLink href={integrationsHref} label={tSettingsNav("integrations")} icon={Plug} active={integrationsActive} resolved={resolved} />
          </>
        ) : (
          <>
            <TopNavLink href={homeHref} label={tNav("home")} icon={Home} active={homeActive} resolved={resolved} />
            <TopNavLink href={clientsHref} label={tNav("clients")} icon={Building2} active={clientsActive} resolved={resolved} />
            <TopNavLink href={vendorsHref} label={tNav("vendors")} icon={Store} active={vendorsActive} resolved={resolved} />
            <TopNavGroup
              label={tNav("contacts")}
              icon={BookUser}
              active={contactsActive}
              resolved={resolved}
              items={[
                { href: contactClientHref, label: tNav("flyoutClient"), active: contactClientActive },
                { href: contactVendorHref, label: tNav("flyoutVendor"), active: contactVendorActive },
              ]}
            />
            <TopNavLink href={sitesHref} label={tNav("sites")} icon={MapPinHouse} active={sitesActive} resolved={resolved} />
            <TopNavGroup
              label={tNav("quotations")}
              icon={FileText}
              active={quotationsActive}
              resolved={resolved}
              items={[
                { href: quotationServiceHref, label: tNav("flyoutService"), active: quotationServiceActive },
                { href: quotationProjectHref, label: tNav("flyoutProject"), active: quotationProjectActive },
              ]}
            />
            <TopNavLink href={invoicesHref} label={tNav("invoices")} icon={Receipt} active={invoicesActive} resolved={resolved} />
            <TopNavLink href={purchaseOrdersHref} label={tNav("purchaseOrders")} icon={ClipboardList} active={purchaseOrdersActive} resolved={resolved} />
            <TopNavGroup
              label={tNav("jobs")}
              icon={ListTodo}
              active={jobsActive}
              resolved={resolved}
              items={[
                { href: serviceJobHref, label: tNav("flyoutService"), active: serviceJobActive },
                { href: projectJobHref, label: tNav("flyoutProject"), active: projectJobActive },
              ]}
            />
            <TopNavLink href={schedulingHref} label={tNav("scheduling")} icon={CalendarDays} active={schedulingActive} resolved={resolved} />
            <TopNavLink href={qrCodesHref} label={tNav("qrCodes")} icon={QrCode} active={qrCodesActive} resolved={resolved} />
            <TopNavLink href={projectsHref} label={tNav("projects")} icon={FolderKanban} active={projectsActive} resolved={resolved} />
            <TopNavLink href={groupsHref} label={tNav("groups")} icon={Layers} active={groupsActive} resolved={resolved} />
            <TopNavLink href={materialRequestsHref} label={tNav("materialRequests")} icon={ClipboardList} active={materialRequestsActive} resolved={resolved} />
            <TopNavLink href={dispatchesHref} label={tNav("dispatches")} icon={Truck} active={dispatchesActive} resolved={resolved} dataNav="dispatches" />
            <TopNavLink href={returnToStockHref} label={tNav("returnToStock")} icon={RotateCcw} active={returnToStockActive} resolved={resolved} />
            <TopNavGroup
              label={tNav("products")}
              icon={Package}
              active={itemsSectionActive}
              resolved={resolved}
              items={[
                { href: itemsHref, label: tNav("itemsPlain"), active: itemsActive },
                { href: compositeHref, label: tNav("compositeItems"), active: compositeActive },
              ]}
            />
          </>
        )}
      </nav>
    </header>
  );
}
