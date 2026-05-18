/** Skeleton shown inside entity detail `SurfaceShell` while loading. */
export function EntityDetailLoadingSkeleton() {
  return (
    <div className="space-y-3 p-4 sm:p-6">
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
