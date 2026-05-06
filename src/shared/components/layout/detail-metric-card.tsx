import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/** Responsive 2–3 column grid for SaaS-style summary fields on detail pages */
export function DetailMetricsGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>
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
    <div
      className={cn(
        "rounded-lg border border-slate-200/90 bg-slate-50/90 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/45",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 min-w-0 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">{children}</div>
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
    <div
      className={cn(
        "rounded-lg border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/60",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 min-w-0 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{children}</div>
    </div>
  );
}

export function DetailSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{children}</h3>
  );
}

/** Tighter padded shell for detail tab content inside SurfaceShell */
export function DetailPagePadding({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5 p-3.5 sm:p-5", className)}>{children}</div>;
}
