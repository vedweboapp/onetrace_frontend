"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import {
  detailTabFillStateClassName,
  detailTabFillViewportClassName,
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

/** Full-height list tab shell — toolbar + table, or centered empty/loading/error. */
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
  const fillViewport = Boolean(loadError) || loading || isEmpty;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        fillViewport && detailTabFillViewportClassName,
        className,
      )}
    >
      {toolbar}
      <div className={cn("flex min-h-0 min-w-0 flex-col", fillViewport && "flex-1")}>
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
