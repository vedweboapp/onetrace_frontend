"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { ActiveStatusBadge } from "@/shared/ui";
import { DetailCollapsibleSection } from "./detail-collapsible-section";

/** Soft canvas behind a single flat detail surface (avoid card-in-card). */
export const detailRecordSurfaceShellClassName = cn(
  "overflow-visible rounded-none border border-slate-200/90 bg-white shadow-none ring-0",
  "dark:border-slate-800 dark:bg-slate-950",
);

/** Vertical stack for detail sections — spacing only, no divider lines between sections. */
export const detailPageStackClassName = "flex flex-col gap-1";

/** Responsive grid for label/value pairs inside a detail section */
export function DetailMetricsGrid({
  children,
  className,
  compact,
}: {
  children: ReactNode;
  className?: string;
  /** Pack fields by content width (flex wrap) — avoids wide empty gaps beside maps. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-start gap-x-5 gap-y-3 [&>*]:min-w-[8.75rem] [&>*]:max-w-[16rem]",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        "sm:grid-cols-[repeat(auto-fill,minmax(8.75rem,1fr))] sm:gap-x-4 sm:gap-y-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DetailMetricCard({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 min-w-0 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}

/** Active / inactive status — place first in the top detail card. */
export function DetailStatusMetric({
  label,
  isActive,
  activeLabel,
  inactiveLabel,
}: {
  label: ReactNode;
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <DetailMetricCard label={label}>
      <ActiveStatusBadge active={isActive} label={isActive ? activeLabel : inactiveLabel} />
    </DetailMetricCard>
  );
}

export function DetailWideCard({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 min-w-0 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>
    </div>
  );
}

export function DetailSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{children}</h3>
  );
}

export function DetailPagePadding({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full", className)}>{children}</div>;
}

/** White section card for detail pages (overview, address, system metadata, etc.). */
export { DetailCollapsibleSection, type DetailCollapsibleSectionProps } from "./detail-collapsible-section";
export { DetailSectionCountBadge } from "./detail-section-count-badge";

export function DetailPanelCard({
  title,
  headerRight,
  badge,
  children,
  className,
  bodyClassName,
  defaultOpen = true,
  collapsible = true,
  /** Flat section (WMS/Zoho detail style); supports collapse chevron when `collapsible`. */
  variant = "flat",
  toggleAriaLabel = "Toggle section",
}: {
  title?: ReactNode;
  headerRight?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  variant?: "card" | "flat";
  toggleAriaLabel?: string;
}) {
  if (variant === "flat") {
    if (title && collapsible) {
      return (
        <DetailCollapsibleSection
          title={title}
          badge={badge}
          headerRight={headerRight}
          defaultOpen={defaultOpen}
          className={cn(
            "rounded-none border-0 border-b-0 bg-transparent shadow-none [&]:border-0 dark:bg-transparent",
            "[&>div:first-child]:border-b-0",
            className,
          )}
          bodyClassName={cn("px-4 pb-4 pt-0 sm:px-5 sm:pb-5", bodyClassName)}
          toggleAriaLabel={toggleAriaLabel}
        >
          {children}
        </DetailCollapsibleSection>
      );
    }

    return (
      <section className={cn("bg-transparent", className)}>
        {title ? (
          <div className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
            {headerRight || badge ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                {badge}
                {headerRight}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={cn("px-4 pb-4 sm:px-5 sm:pb-5", bodyClassName)}>{children}</div>
      </section>
    );
  }

  if (title && collapsible) {
    return (
      <DetailCollapsibleSection
        title={title}
        badge={badge}
        headerRight={headerRight}
        defaultOpen={defaultOpen}
        className={className}
        bodyClassName={bodyClassName}
        toggleAriaLabel={toggleAriaLabel}
      >
        {children}
      </DetailCollapsibleSection>
    );
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-md border border-slate-200/95 bg-white shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      {title ? (
        <div className="flex flex-col gap-1.5 border-b border-slate-100 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
          {headerRight ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{headerRight}</div>
          ) : null}
        </div>
      ) : null}
      <div className={cn("px-4 py-2.5 sm:px-5 sm:py-3", bodyClassName)}>{children}</div>
    </section>
  );
}
