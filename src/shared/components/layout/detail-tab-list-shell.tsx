"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { DashboardLoadErrorState } from "@/shared/ui/dashboard-load-error-state";
import {
  detailTabStandaloneFillClassName,
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
 * Detail list tab shell — toolbar + table body, or centered empty/loading/error.
 * With rows: natural height so pagination sits under the table (no filler gap).
 * Empty/loading/error: full remaining viewport height (same feel as Home WIP).
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
  const fillViewport = !showTable;

  return (
    <div
      className={cn(
        "flex min-w-0 w-full flex-col",
        fillViewport ? detailTabStandaloneFillClassName : null,
        className,
      )}
    >
      {toolbar}
      <div
        className={cn(
          "flex min-w-0 flex-col",
          fillViewport && "min-h-0 flex-1",
        )}
      >
        {loadError ? (
          errorFallback ?? <DashboardLoadErrorState message={loadError} />
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
 * Edge-to-edge table + pagination for detail list tabs.
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
