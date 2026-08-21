import { Construction } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { detailTabFillStateClassName, detailTabFillViewportClassName } from "@/shared/components/layout/detail-tab-layout";

type DashboardUnderDevelopmentStateProps = {
  title: string;
  description: string;
  className?: string;
};

/**
 * Full-panel “coming soon” state — fills the available shell height
 * (Zoho / WMS style) instead of a tiny island in a tall empty card.
 */
export function DashboardUnderDevelopmentState({
  title,
  description,
  className,
}: DashboardUnderDevelopmentStateProps) {
  return (
    <div
      className={cn(
        detailTabFillViewportClassName,
        detailTabFillStateClassName,
        "px-5 sm:px-8",
        className,
      )}
    >
      <div
        className={cn(
          "mb-5 inline-flex size-12 items-center justify-center rounded-xl sm:mb-6 sm:size-14 sm:rounded-2xl",
          "border border-slate-200/90 bg-white text-slate-400 shadow-sm",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500",
        )}
      >
        <Construction className="size-5 sm:size-6" strokeWidth={1.6} aria-hidden />
      </div>

      <h3 className="max-w-lg text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
        {title}
      </h3>
      <p className="mt-2.5 max-w-md text-[length:var(--dash-body-size,0.875rem)] leading-6 text-slate-500 dark:text-slate-400 sm:mt-3">
        {description}
      </p>

      <div
        className="mt-8 hidden w-full max-w-xs space-y-2.5 sm:mt-10 sm:block"
        aria-hidden
      >
        <div className="mx-auto h-2.5 w-full max-w-[11rem] rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="mx-auto h-2.5 w-full max-w-[8.5rem] rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="mx-auto h-2.5 w-full max-w-[6.5rem] rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
