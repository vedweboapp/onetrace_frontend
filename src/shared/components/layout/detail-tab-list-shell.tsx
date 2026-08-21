"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import {
  detailTabFillStateClassName,
  detailTabFillViewportClassName,
  detailTabTableBodyClassName,
} from "./detail-tab-layout";

type Props = {
  loading: boolean;
  loadError?: string | null;
  isEmpty: boolean;
  toolbar?: ReactNode;
  loadingFallback: ReactNode;
  emptyFallback: ReactNode;
  errorFallback?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Full-height list tab shell — toolbar + table body, or centered empty/loading/error.
 * When data is present, fills viewport height so pagination can stick to the card footer.
 */
export function DetailTabListShell({
  loading,
  loadError,
  isEmpty,
  toolbar,
  loadingFallback,
  emptyFallback,
  errorFallback,
  children,
  className,
}: Props) {
  const showTable = !loadError && !loading && !isEmpty;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        detailTabFillViewportClassName,
        className,
      )}
    >
      {toolbar}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", showTable && "overflow-hidden")}>
        {loadError ? (
          errorFallback ?? (
            <div className={detailTabFillStateClassName}>
              <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
            </div>
          )
        ) : loading ? (
          loadingFallback
        ) : isEmpty ? (
          emptyFallback
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * Edge-to-edge table + sticky pagination footer for detail list tabs.
 * Place `EntityDataTable` then `DataTablePaginationBar` as children.
 */
export function DetailTabTableBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(detailTabTableBodyClassName, className)}>{children}</div>;
}
