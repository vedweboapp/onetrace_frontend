import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/**
 * Use on `SurfaceShell` for entity **detail** routes so content sits on a soft gray canvas
 * with white section cards (Zoho-style record view).
 */
export const detailRecordSurfaceShellClassName = cn(
  "rounded-none border-0 border-t border-slate-200/90 bg-slate-100/90 shadow-none ring-0",
  "dark:border-slate-800 dark:bg-slate-950",
);

/** Responsive grid for label/value pairs inside a detail section */
export function DetailMetricsGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>
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
      <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1.5 min-w-0 text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">{children}</div>
    </div>
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
    <div className={cn("min-w-0 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/40", className)}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1.5 min-w-0 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{children}</div>
    </div>
  );
}

export function DetailSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{children}</h3>
  );
}

/** Vertical stack spacing for detail bodies (cards use their own padding). */
export function DetailPagePadding({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-3 px-4 py-3 sm:px-5 sm:py-4", className)}>{children}</div>;
}

/** Section card: title row + optional header actions (Zoho-style record blocks). */
export function DetailPanelCard({
  title,
  headerRight,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  /** e.g. filters or toolbar actions — rendered on the right of the title row */
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Merged onto the body region below the header strip */
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-slate-200/95 bg-white",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-1.5 border-b border-slate-100 bg-white px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-2.5",
          "dark:border-slate-800 dark:bg-slate-900",
        )}
      >
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
        {headerRight ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{headerRight}</div> : null}
      </div>
      <div className={cn("px-4 py-2.5 sm:px-5 sm:py-3", bodyClassName)}>{children}</div>
    </div>
  );
}
