"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardList,
  FileQuestion,
  FolderKanban,
  Hammer,
  Home,
  Layers,
  ListTodo,
  Package,
  SearchX,
  Tags,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { detailTabFillStateClassName } from "@/shared/components/layout/detail-tab-layout";

export type DashboardEmptyStateIconName =
  | "default"
  | "home"
  | "clients"
  | "projects"
  | "groups"
  | "items"
  | "compositeItems"
  | "pinStatus"
  | "projectStatus"
  | "jobStatus"
  | "materialStatus"
  | "noResults"
  | "notFound";

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
};

/**
 * Full-panel empty / not-found state (WMS / Zoho style).
 * In list shells, use without `compact` so it fills the viewport under the header.
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
}: DashboardEmptyStateProps) {
  const iconByName: Record<DashboardEmptyStateIconName, LucideIcon> = {
    default: Hammer,
    home: Home,
    clients: Building2,
    projects: FolderKanban,
    groups: Layers,
    items: Package,
    compositeItems: Package,
    pinStatus: Tags,
    projectStatus: Tags,
    jobStatus: ListTodo,
    materialStatus: ClipboardList,
    noResults: SearchX,
    notFound: FileQuestion,
  };
  const Icon = icon ?? iconByName[iconName];

  return (
    <div
      className={cn(
        fill
          ? detailTabFillStateClassName
          : cn(
              "flex w-full flex-col items-center justify-center px-6 text-center",
              compact ? "min-h-0 py-10 sm:py-14" : "min-h-0 flex-1 py-12 sm:py-16",
            ),
        className,
      )}
    >
      <div
        className={cn(
          "mb-5 inline-flex size-14 items-center justify-center rounded-2xl",
          "bg-gradient-to-br from-sky-50 to-indigo-50 text-orange-500",
          "ring-1 ring-slate-200/80 dark:from-slate-800 dark:to-slate-900 dark:text-orange-400 dark:ring-slate-700",
        )}
      >
        <Icon className="size-7" strokeWidth={1.6} aria-hidden />
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
        {title}
      </h3>
      <p className="mt-2.5 max-w-md text-[length:var(--dash-body-size,0.875rem)] leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {action || secondaryAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
