"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Building2, FolderKanban, Hammer, Home, Layers, Package, SearchX, Tags } from "lucide-react";
import { cn } from "@/core/utils/http.util";

type DashboardEmptyStateIconName =
  | "default"
  | "home"
  | "clients"
  | "projects"
  | "groups"
  | "compositeItems"
  | "pinStatus"
  | "noResults";

type DashboardEmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  iconName?: DashboardEmptyStateIconName;
  action?: React.ReactNode;
  className?: string;
};

export function DashboardEmptyState({
  title,
  description,
  icon,
  iconName = "default",
  action,
  className,
}: DashboardEmptyStateProps) {
  const iconByName: Record<DashboardEmptyStateIconName, LucideIcon> = {
    default: Hammer,
    home: Home,
    clients: Building2,
    projects: FolderKanban,
    groups: Layers,
    compositeItems: Package,
    pinStatus: Tags,
    noResults: SearchX,
  };
  const Icon = icon ?? iconByName[iconName];

  return (
    <div
      className={cn(
        "flex min-h-[420px] flex-col items-center justify-center rounded-2xl bg-slate-50/45 px-6 text-center dark:bg-slate-900/25",
        className,
      )}
    >
      <div className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
        <Icon className="size-6" strokeWidth={1.7} />
      </div>
      <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

