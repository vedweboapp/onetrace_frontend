"use client";

import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";

type Props = {
  className?: string;
  /** Narrow rail: compact mark only (placeholder until logo asset). */
  collapsed?: boolean;
};


export function DashboardAppBrand({ className, collapsed }: Props) {
  return (
    <Link
      href={routes.dashboard.projects}
      className={cn(
        "flex min-w-0 items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600",
        collapsed && "justify-center gap-0",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-bold tracking-tight text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
          collapsed && "text-[9px]",
        )}
        aria-hidden={!collapsed}
      >
        {collapsed ? "R5" : null}
      </span>
      {!collapsed ? (
        <span className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Red5
        </span>
      ) : (
        <span className="sr-only">Red5</span>
      )}
    </Link>
  );
}
