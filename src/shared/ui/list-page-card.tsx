"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/**
 * List card grid — denser on large screens so cards stay readable,
 * not stretched sparse islands.
 */
export function ListPageCardGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-stretch gap-3 sm:gap-4",
        "md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Compact secondary line under the title (client · site, email, etc.). */
export function ListPageCardMetaLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-[13px] leading-5 text-slate-500 dark:text-slate-400",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Aligned footer: status/chips left, date/amount right. */
export function ListPageCardFooter({
  start,
  end,
  className,
}: {
  start?: ReactNode;
  end?: ReactNode;
  className?: string;
}) {
  if (!start && !end) return null;
  return (
    <div className={cn("flex w-full items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">{start}</div>
      {end ? (
        <div className="shrink-0 text-right text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
          {end}
        </div>
      ) : null}
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
  /** Top-right chip (status, type) — kept clear of the title. */
  installationType?: ReactNode;
  badge?: ReactNode;
};

export function ListPageCard({
  leading,
  title,
  subtitle,
  meta,
  description,
  installationType,
  badge,
  footer,
  onCardClick,
  menu,
  className,
  dataListRowId,
}: ListPageCardProps) {
  const topBadge = badge ?? installationType;

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
        "group/card relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl",
        "border border-slate-200/90 bg-white",
        "dark:border-slate-800 dark:bg-slate-950",
        onCardClick &&
          "cursor-pointer transition-[border-color,box-shadow,background-color] duration-150",
        onCardClick &&
          "hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-sm dark:hover:border-slate-600 dark:hover:bg-slate-900/60",
        className,
      )}
    >
      {menu ? (
        <div
          className="absolute right-2 top-2 z-10 sm:right-2.5 sm:top-2.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {menu}
        </div>
      ) : null}

      <div className={cn("flex min-w-0 flex-1 flex-col gap-3 px-4 py-3.5 sm:px-4 sm:py-4", menu && "pr-10")}>
        <div className="flex min-w-0 items-start gap-2.5">
          {leading ? (
            <div
              className="flex shrink-0 items-center pt-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {leading}
            </div>
          ) : null}

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm font-semibold leading-5 tracking-tight text-slate-900 dark:text-slate-50">
                <div className="line-clamp-2 break-words">{title}</div>
              </div>
              {topBadge ? <div className="max-w-[42%] shrink-0">{topBadge}</div> : null}
            </div>
            {subtitle ? (
              <div className="line-clamp-2 min-w-0 text-[13px] font-medium leading-5 text-slate-600 dark:text-slate-300">
                {subtitle}
              </div>
            ) : null}
            {meta ? <div className="min-w-0 pt-0.5">{meta}</div> : null}
          </div>
        </div>

        {description ? (
          <p className="line-clamp-2 min-w-0 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>

      {footer ? (
        <div
          className="mt-auto border-t border-slate-100 px-4 py-2.5 dark:border-slate-800/80"
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
        "min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex items-start gap-2.5 px-4 py-3.5">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-3.5 w-2/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="size-7 shrink-0 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-800/80">
        <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
