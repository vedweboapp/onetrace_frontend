"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/** Responsive SaaS-style card grid — 1 → 2 → 3 → 4 columns by viewport width. */
export function ListPageCardGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5",
        className,
      )}
    >
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
        "relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-950/[0.03]",
        "dark:border-slate-800 dark:bg-slate-950 dark:ring-white/[0.04]",
        onCardClick &&
          "cursor-pointer transition hover:border-slate-300 hover:bg-slate-50/90 hover:shadow-md dark:hover:border-slate-600 dark:hover:bg-slate-900/80",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {leading ? (
          <div
            className="flex shrink-0 items-center pt-0.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {leading}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 truncate text-sm font-medium text-slate-600 dark:text-slate-400">
              {subtitle}
            </div>
          ) : null}
          {meta ? (
            <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-500">{meta}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {installationType ? <div className="max-w-[40%] shrink-0">{installationType}</div> : null}
          {menu ? (
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              {menu}
            </div>
          ) : null}
        </div>
      </div>

      {description ? (
        <p className="mt-3 line-clamp-2 min-w-0 break-words text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}

      {footer ? (
        <div
          className="mt-auto border-t border-slate-100 pt-3 dark:border-slate-800/80"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="min-w-0 overflow-hidden">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

export function ListPageCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex justify-between gap-2">
        <div className="h-5 min-w-0 flex-1 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
        <div className="size-8 shrink-0 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
