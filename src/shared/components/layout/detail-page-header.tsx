"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useDashboardChromeStore } from "@/features/dashboard/store/dashboard-chrome.store";
import { dashboardContentHorizontalGutterClassName } from "@/shared/config/dashboard-shell";
import { cn } from "@/core/utils/http.util";

/** Pulse bar shown in the detail chrome title while the record loads. */
export function DetailPageHeaderTitleSkeleton() {
  return (
    <span
      className="block h-4 max-w-[12rem] animate-pulse rounded bg-slate-200 dark:bg-slate-700 sm:max-w-[16rem]"
      aria-hidden
    />
  );
}

function DetailPageHeaderLoadingBar() {
  return (
    <div className={cn(dashboardContentHorizontalGutterClassName, "pb-1")} aria-hidden>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full w-2/5 rounded-full bg-[color:var(--dash-accent,#111)] motion-safe:animate-pulse"
        />
      </div>
    </div>
  );
}

type Props = {
  title: ReactNode;
  /** When true, title shows a skeleton bar instead of visible title text (use `title` for sr-only label). */
  titleLoading?: boolean;
  backHref?: string | null;
  backAriaLabel: string;
  actions?: ReactNode;
  subtitle?: ReactNode;
  extension?: ReactNode;
  className?: string;
};

export function DetailPageHeader({
  title,
  titleLoading = false,
  backHref,
  backAriaLabel,
  actions,
  subtitle,
  extension,
  className,
}: Props) {
  const setSecondaryRow = useDashboardChromeStore((s) => s.setSecondaryRow);

  React.useEffect(() => {
    setSecondaryRow(
      <div className={className}>
        <div
          className={cn(
            dashboardContentHorizontalGutterClassName,
            "flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-2 py-1",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {backHref ? (
              <Link
                href={backHref}
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-slate-500 transition",
                  "hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800",
                  "dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                )}
                aria-label={backAriaLabel}
              >
                <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
              </Link>
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="min-w-0 truncate text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                {titleLoading ? <DetailPageHeaderTitleSkeleton /> : title}
              </h1>
              {titleLoading && title ? <span className="sr-only">{title}</span> : null}
              {subtitle ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {titleLoading ? <DetailPageHeaderLoadingBar /> : null}
        {extension ? (
          <div
            className={cn(
              dashboardContentHorizontalGutterClassName,
              "border-t border-slate-200 py-2 dark:border-slate-800",
            )}
          >
            {extension}
          </div>
        ) : null}
      </div>,
    );
    return () => setSecondaryRow(null);
  }, [title, titleLoading, backHref, backAriaLabel, actions, subtitle, extension, className, setSecondaryRow]);

  return null;
}
