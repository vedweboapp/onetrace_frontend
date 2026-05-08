"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

export function ListPageCardGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type ListPageCardProps = {
  /** Renders before the title (e.g. row checkbox). */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  description?: string;
  /** Bottom row (e.g. phone + status badge left, created date right). Uses mt-auto so it sits at the bottom in a grid. */
  footer?: ReactNode;
  onCardClick?: () => void;
  menu: ReactNode;
  className?: string;
  /** When set, adds `data-list-row-id` for return-from-detail highlight + scroll. */
  dataListRowId?: number;
};

/** Card row for list (grid) view — title, kebab, secondary lines, optional body, optional footer. */
export function ListPageCard({
  leading,
  title,
  subtitle,
  meta,
  description,
  footer,
  onCardClick,
  menu,
  className,
  dataListRowId,
}: ListPageCardProps) {
  return (
    <div
      data-list-row-id={dataListRowId != null ? String(dataListRowId) : undefined}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={(e) => {
        if (!onCardClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardClick();
        }
      }}
      className={cn(
        "relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-950/[0.03] dark:border-slate-800 dark:bg-slate-950 dark:ring-white/[0.04]",
        footer && "min-h-[8.5rem]",
        onCardClick &&
          "cursor-pointer transition hover:border-slate-300 hover:bg-slate-50/90 dark:hover:border-slate-600 dark:hover:bg-slate-900/80",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 pr-2">
          {leading ? (
            <div
              className="shrink-0 pt-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {leading}
            </div>
          ) : null}
          <div className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </div>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {menu}
        </div>
      </div>
      {subtitle ? (
        <p className="mt-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">{subtitle}</p>
      ) : null}
      {meta ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{meta}</p> : null}
      {description ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
      {footer ? (
        <div
          className="mt-auto border-t border-slate-100 pt-3 dark:border-slate-800/80"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function ListPageCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex justify-between gap-2">
        <div className="h-5 flex-1 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
        <div className="size-8 shrink-0 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
