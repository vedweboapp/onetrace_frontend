import { Loader2 } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { detailTabFillStateClassName } from "@/shared/components/layout/detail-tab-layout";

type SkeletonProps = {
  /** When true, center in the tab pane and fill available height. */
  fill?: boolean;
  className?: string;
};

/** Skeleton shown inside entity detail `SurfaceShell` while loading. */
export function EntityDetailLoadingSkeleton({ fill = false, className }: SkeletonProps = {}) {
  if (fill) {
    return <EntityDetailTabLoadingState className={className} />;
  }

  return (
    <div className={cn("space-y-3 p-4 sm:p-6", className)}>
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

/** Full-pane loading for detail list tabs and in-progress placeholders. */
export function EntityDetailTabLoadingState({ className }: { className?: string } = {}) {
  return (
    <div className={cn(detailTabFillStateClassName, className)} role="status" aria-live="polite">
      <Loader2
        className="size-9 animate-spin text-slate-300 dark:text-slate-600"
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="mt-8 w-full max-w-xs space-y-2.5" aria-hidden>
        <div className="mx-auto h-2.5 w-full max-w-[11rem] animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="mx-auto h-2.5 w-full max-w-[8.5rem] animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="mx-auto h-2.5 w-full max-w-[6.5rem] animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
