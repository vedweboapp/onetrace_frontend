"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { AppButton } from "./app-button";

/** Minimal pagination slice from APIs like `{ current_page, total_pages, total_records }`. */
export type DataTablePagination = {
  current_page: number;
  total_pages: number;
  total_records: number;
};

export type DataTablePaginationBarProps = {
  pagination: DataTablePagination;
  /** Pre-translated line (e.g. `pageLabel` interpolation). */
  summary: ReactNode;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
};

/** Paginated table footer aligned with SurfaceShell/DataTable paddings; hidden when total_pages ≤ 1. */
export function DataTablePaginationBar({
  pagination,
  summary,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  className,
}: DataTablePaginationBarProps) {
  if (pagination.total_pages <= 1) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:px-6",
        className,
      )}
    >
      <p>{summary}</p>
      <div className="flex gap-2">
        <AppButton type="button" variant="secondary" size="sm" disabled={pagination.current_page <= 1} onClick={onPrev}>
          {prevLabel}
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={pagination.current_page >= pagination.total_pages}
          onClick={onNext}
        >
          {nextLabel}
        </AppButton>
      </div>
    </div>
  );
}
