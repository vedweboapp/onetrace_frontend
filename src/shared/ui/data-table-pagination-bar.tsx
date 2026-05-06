"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { normalizeListPageSize } from "@/shared/utils/list-page-size.util";
import { CheckmarkSelect } from "./checkmark-select";
import type { CheckmarkSelectOption } from "./checkmark-select";

/** Minimal pagination slice from APIs like `{ current_page, total_pages, total_records }`. */
export type DataTablePagination = {
  current_page: number;
  total_pages: number;
  total_records: number;
};

export type DataTablePageSizeControl = {
  /** @deprecated Not shown; use `listLabel` / `buttonAriaLabel` for accessibility. */
  label?: string;
  listLabel: string;
  /** Overrides `listLabel` on the trigger `aria-label` when set. */
  buttonAriaLabel?: string;
  value: number;
  options: CheckmarkSelectOption[];
  onChange: (size: number) => void;
  disabled?: boolean;
};

function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) set.add(p);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

export type DataTablePaginationBarProps = {
  pagination: DataTablePagination;
  /** Pre-translated line (e.g. range summary). */
  summary: ReactNode;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onPageSelect: (page: number) => void;
  /** Rows per page; uses same `CheckmarkSelect` pattern as list filters. */
  pageSizeControl?: DataTablePageSizeControl;
  className?: string;
};

/** Paginated table footer aligned with SurfaceShell/DataTable paddings. */
export function DataTablePaginationBar({
  pagination,
  summary,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  onPageSelect,
  pageSizeControl,
  className,
}: DataTablePaginationBarProps) {
  const { current_page, total_pages } = pagination;
  const showNumberButtons = total_pages > 1;
  const pages = showNumberButtons ? buildPageList(current_page, total_pages) : [];

  const btnBase = cn(
    "inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition outline-none",
    "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    "disabled:pointer-events-none disabled:opacity-45",
    "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
    "focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-950",
  );

  const activeBtn = cn(
    "border-slate-900 bg-slate-900 text-white hover:bg-slate-900 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-100",
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400",
        className,
      )}
    >
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">{summary}</p>
        <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:justify-end">
          {pageSizeControl ? (
            <CheckmarkSelect
              listLabel={pageSizeControl.listLabel}
              buttonAriaLabel={pageSizeControl.buttonAriaLabel ?? pageSizeControl.listLabel}
              options={pageSizeControl.options}
              value={String(pageSizeControl.value)}
              disabled={pageSizeControl.disabled}
              portaled
              size="sm"
              showCheckmarks={false}
              className="w-auto shrink-0"
              onChange={(v) => pageSizeControl.onChange(normalizeListPageSize(Number.parseInt(v, 10)))}
            />
          ) : null}
          {showNumberButtons ? (
            <>
              <button type="button" className={cn(btnBase, "px-2.5")} disabled={current_page <= 1} onClick={onPrev}>
                {prevLabel}
              </button>
              <div className="flex items-center gap-1">
                {pages.map((p, i) =>
                  p === "ellipsis" ? (
                    <span key={`e-${i}`} className="px-1 text-slate-400" aria-hidden>
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={cn(btnBase, "size-8 min-h-8 min-w-8 px-0", p === current_page && activeBtn)}
                      aria-current={p === current_page ? "page" : undefined}
                      onClick={() => onPageSelect(p)}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                className={cn(btnBase, "px-2.5")}
                disabled={current_page >= total_pages}
                onClick={onNext}
              >
                {nextLabel}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
