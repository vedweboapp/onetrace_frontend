"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/**
 * List card grid: one column on small screens, two on desktop.
 * Caps at two so cards stay wide enough for titles, links, and chips.
 */
export function ListPageCardGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 md:gap-6", className)}>
      {children}
    </div>
  );
}

type ListPageCardProps = {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  description?: string;
  footer?: ReactNode;
  onCardClick?: () => void;
  menu?: ReactNode;
  className?: string;
  dataListRowId?: number;
  installationType?: ReactNode;
};

export function ListPageCard({
  leading,
  title,
  subtitle,
  meta,
  description,
  installationType,
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
        "group/card relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white",
        "px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        "dark:border-slate-800 dark:bg-slate-950 dark:shadow-none",
        onCardClick &&
          "cursor-pointer transition duration-150 hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)] dark:hover:border-slate-600 dark:hover:bg-slate-900/75",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {leading ? (
          <div
            className="flex shrink-0 items-start pt-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {leading}
          </div>
        ) : null}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="min-w-0 break-words text-[0.9375rem] font-semibold leading-6 tracking-tight text-slate-900 dark:text-slate-50">
            {title}
          </div>
          {subtitle ? (
            <div className="min-w-0 text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">
              {subtitle}
            </div>
          ) : null}
          {meta ? (
            <div className="min-w-0 text-sm leading-5 text-slate-500 dark:text-slate-400">{meta}</div>
          ) : null}
        </div>

        {installationType || menu ? (
          <div className="flex shrink-0 items-start gap-2 pl-1">
            {installationType ? <div className="max-w-[11rem] shrink-0">{installationType}</div> : null}
            {menu ? (
              <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                {menu}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {description ? (
        <p className="mt-3 line-clamp-3 min-w-0 break-words text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}

      {footer ? (
        <div
          className="mt-auto border-t border-slate-100 pt-4 dark:border-slate-800/80"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="min-w-0">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

export function ListPageCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-5 py-5 dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="h-5 w-3/5 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
          <div className="h-4 w-2/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="size-8 shrink-0 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800/80">
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
