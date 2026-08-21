"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { ActiveStatusBadge, FormFieldRow, FormFieldSpanFull } from "@/shared/ui";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { DetailEditableField, detailFieldLabelClassName, detailValueSurfaceClassName } from "./detail-editable-field";
import { DetailCollapsibleSection } from "./detail-collapsible-section";

/** Soft canvas behind a single flat detail surface (avoid card-in-card). */
export const detailRecordSurfaceShellClassName = cn(
  "overflow-visible rounded-none border border-slate-200/90 bg-white shadow-none ring-0",
  "dark:border-slate-800 dark:bg-slate-950",
);

/** Detail record shell — full width, left-aligned (matches create/edit forms). */
export const detailRecordInnerClassName = "w-full min-w-0";

/** Form-like max width for detail field blocks on wide screens (CRM-style). */
export const detailFieldsLayoutClassName = "w-full min-w-0 max-w-5xl";

export function DetailFieldsLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(detailFieldsLayoutClassName, className)}>{children}</div>;
}

/** Span full row inside `DetailMetricsGrid` (same as form `FormFieldSpanFull`). */
export { FormFieldSpanFull as DetailFieldSpanFull };

/** Vertical stack for detail sections with light dividers (flat record surface). */
export const detailPageStackClassName = "flex flex-col divide-y divide-slate-100 dark:divide-slate-800";

/** Flat detail body: no extra padding inside the white record shell. */
export const detailPageBodyPaddingClassName = "!px-0 !py-0 sm:!px-0 sm:!py-0";

/** Shared flat section chrome (title row + body padding). */
export const detailFlatSectionHeaderClassName =
  "flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5";
export const detailFlatSectionBodyClassName = "px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-5";
export const detailFlatSectionTitleClassName =
  "text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100";

export function activeStatusSelectOptions(
  activeLabel: string,
  inactiveLabel: string,
): CheckmarkSelectOption[] {
  return [
    { value: "true", label: activeLabel },
    { value: "false", label: inactiveLabel },
  ];
}

/** Inline-editable active/inactive status (shared across entity detail pages). */
export function DetailActiveStatusField({
  label,
  isActive,
  activeLabel,
  inactiveLabel,
  editAriaLabel,
  onSave,
}: {
  label: ReactNode;
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
  editAriaLabel: string;
  onSave: (next: boolean) => Promise<void>;
}) {
  return (
    <DetailEditableField
      label={label}
      value={isActive ? "true" : "false"}
      kind="select"
      options={activeStatusSelectOptions(activeLabel, inactiveLabel)}
      editAriaLabel={editAriaLabel}
      onSave={(next) => onSave(next === "true")}
    >
      <ActiveStatusBadge active={isActive} label={isActive ? activeLabel : inactiveLabel} />
    </DetailEditableField>
  );
}

/** Responsive grid — max **two** fields per row; reuses form field row layout. */
export function DetailMetricsGrid({
  children,
  className,
  compact,
  columns = 2,
  wide = false,
  /** Delay 2-col until this breakpoint (use `xl` next to a map side column). */
  from = "sm",
}: {
  children: ReactNode;
  className?: string;
  /** @deprecated Same 2-column grid; kept for call-site compatibility. */
  compact?: boolean;
  /** Only `1` or `2` columns; default is two fields per row. */
  columns?: 1 | 2;
  /** When true, field grid spans full record width (e.g. beside a map column). */
  wide?: boolean;
  from?: "sm" | "md" | "lg" | "xl";
}) {
  void compact;
  return (
    <div className="detail-metrics-host">
      <FormFieldRow
        cols={columns === 1 ? "1" : "2"}
        from={from}
        className={cn(
          "detail-metrics-grid",
          !wide && detailFieldsLayoutClassName,
          "gap-x-8 gap-y-3.5",
          className,
        )}
      >
        {children}
      </FormFieldRow>
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
    <div className={cn("field-group detail-field min-w-0", className)}>
      <p className={detailFieldLabelClassName}>{label}</p>
      <div
        className={cn(
          "field-control-wrap min-w-0 flex-1",
          detailValueSurfaceClassName,
        )}
      >
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
    <div className={cn("field-group detail-field min-w-0", className)}>
      <p className={detailFieldLabelClassName}>{label}</p>
      <div className="field-control-wrap min-w-0 flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {children}
      </div>
    </div>
  );
}

export function DetailSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{children}</h3>
  );
}

export function DetailPagePadding({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full", detailPageBodyPaddingClassName, className)}>{children}</div>;
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
            "overflow-visible rounded-none border-0 bg-transparent shadow-none dark:bg-transparent",
            className,
          )}
          bodyClassName={cn(detailFlatSectionBodyClassName, bodyClassName)}
          toggleAriaLabel={toggleAriaLabel}
        >
          {children}
        </DetailCollapsibleSection>
      );
    }

    return (
      <section className={cn("bg-transparent", className)}>
        {title ? (
          <div className={detailFlatSectionHeaderClassName}>
            <h2 className={detailFlatSectionTitleClassName}>{title}</h2>
            {headerRight || badge ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                {badge}
                {headerRight}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={cn(detailFlatSectionBodyClassName, bodyClassName)}>{children}</div>
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
