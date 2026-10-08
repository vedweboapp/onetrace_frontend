"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  BookUser,
  Building2,
  CalendarDays,
  ClipboardList,
  ClipboardPen,
  Construction,
  FileQuestion,
  FileText,
  FolderKanban,
  Home,
  Layers,
  ListTodo,
  MapPinHouse,
  MonitorSmartphone,
  Package,
  Palette,
  QrCode,
  Receipt,
  RotateCcw,
  SearchX,
  Settings,
  ShieldCheck,
  Store,
  Tags,
  Truck,
  UserRound,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";
import {
  detailTabFillStateClassName,
  detailTabFillViewportClassName,
} from "@/shared/components/layout/detail-tab-layout";

export type DashboardEmptyStateIconName =
  | "default"
  | "underDevelopment"
  | "home"
  | "clients"
  | "vendors"
  | "sites"
  | "contacts"
  | "quotations"
  | "invoices"
  | "purchaseOrders"
  | "jobs"
  | "scheduling"
  | "qrCodes"
  | "forms"
  | "materialRequests"
  | "dispatches"
  | "returnToStock"
  | "kiosk"
  | "kioskMachines"
  | "kioskForms"
  | "projectForms"
  | "projects"
  | "groups"
  | "items"
  | "compositeItems"
  | "users"
  | "roles"
  | "profiles"
  | "auditLogs"
  | "modules"
  | "companySettings"
  | "customization"
  | "pinStatus"
  | "projectStatus"
  | "jobStatus"
  | "materialStatus"
  | "noResults"
  | "notFound"
  | "error";

type DashboardEmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  iconName?: DashboardEmptyStateIconName;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  /** Shorter layout for embedded tabs/panels (no forced fill). */
  compact?: boolean;
  /** Fill the tab/detail pane and center content (list empty states on detail pages). */
  fill?: boolean;
  /**
   * Also apply viewport min-height. Use on standalone pages (Home, 404, WIP)
   * that are not already wrapped in `detailTabFillViewportClassName`.
   */
  viewportFill?: boolean;
};

const ICON_BY_NAME: Record<DashboardEmptyStateIconName, LucideIcon> = {
  default: Construction,
  underDevelopment: Construction,
  home: Home,
  clients: Building2,
  vendors: Store,
  sites: MapPinHouse,
  contacts: BookUser,
  quotations: FileText,
  invoices: Receipt,
  purchaseOrders: ClipboardList,
  jobs: ListTodo,
  scheduling: CalendarDays,
  qrCodes: QrCode,
  forms: ClipboardPen,
  materialRequests: ClipboardList,
  dispatches: Truck,
  returnToStock: RotateCcw,
  kiosk: MonitorSmartphone,
  kioskMachines: MonitorSmartphone,
  kioskForms: Store,
  projectForms: FileText,
  projects: FolderKanban,
  groups: Layers,
  items: Package,
  compositeItems: Package,
  users: UserRound,
  roles: ShieldCheck,
  profiles: Layers,
  auditLogs: ClipboardList,
  modules: Settings,
  companySettings: Building2,
  customization: Palette,
  pinStatus: Tags,
  projectStatus: Tags,
  jobStatus: ListTodo,
  materialStatus: ClipboardList,
  noResults: SearchX,
  notFound: FileQuestion,
  error: AlertCircle,
};

/**
 * Shared empty / WIP / not-found / error state (list pages, detail tabs, home).
 * Fills the parent shell and centers content with balanced space on every screen size.
 */
export function DashboardEmptyState({
  title,
  description,
  icon,
  iconName = "default",
  action,
  secondaryAction,
  className,
  compact = false,
  fill = false,
  viewportFill = false,
}: DashboardEmptyStateProps) {
  const Icon = icon ?? ICON_BY_NAME[iconName];
  const fillPanel = fill || !compact;

  return (
    <div
      className={cn(
        fillPanel
          ? cn(
              viewportFill ? detailTabFillViewportClassName : null,
              detailTabFillStateClassName,
            )
          : "flex w-full flex-col items-center justify-center px-6 py-10 text-center sm:py-12",
        className,
      )}
    >
      <div
        className={cn(
          "mb-5 inline-flex size-14 items-center justify-center rounded-2xl sm:mb-6",
          "bg-[color:var(--dash-accent,#0f766e)]/10 text-[color:var(--dash-accent,#0f766e)]",
          "ring-1 ring-[color:var(--dash-accent,#0f766e)]/20",
          "dark:bg-[color:var(--dash-accent,#0f766e)]/15 dark:text-[color:var(--dash-accent,#0f766e)] dark:ring-[color:var(--dash-accent,#0f766e)]/30",
        )}
      >
        <Icon className="size-7" strokeWidth={1.6} aria-hidden />
      </div>
      <h3 className="max-w-lg text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
        {title}
      </h3>
      <p className="mt-2.5 max-w-md text-[length:var(--dash-body-size,0.875rem)] leading-6 text-slate-500 dark:text-slate-400 sm:mt-3">
        {description}
      </p>
      {action || secondaryAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-7">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
