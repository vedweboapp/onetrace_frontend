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

/**
 * Compact table footer pinned under the scroll body.
 * Hidden when there is only one page (no page nav / page-size needed).
 * Page number controls render only when `total_pages > 1`.
 */
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
  const { current_page, total_pages, total_records } = pagination;
  const pageSize = pageSizeControl?.value;
  const needsPagination =
    total_pages > 1 ||
    (Number.isFinite(total_records) &&
      Number.isFinite(pageSize) &&
      (pageSize as number) > 0 &&
      total_records > (pageSize as number));

  if (!needsPagination) return null;

  const showPageNav = total_pages > 1;
  const pages = showPageNav ? buildPageList(current_page, total_pages) : [];

  const btnBase = cn(
    "inline-flex h-8 min-h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition outline-none",
    "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    "disabled:pointer-events-none disabled:opacity-45",
    "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
    "focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-950",
  );

  const activeBtn = cn(
    "border-slate-900 bg-slate-900 text-white hover:bg-slate-900 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-100",
  );

  return (
    <div
      className={cn(
        // Pin via flex (sibling of flex-1 scroll body) — avoid sticky, which can leave
        // an empty strip under the bar when the sidebar width reflows.
        "z-20 flex shrink-0 items-center border-t border-slate-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3",
        "dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex w-full min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 text-xs leading-normal text-slate-600 dark:text-slate-400">{summary}</p>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {pageSizeControl ? (
            <CheckmarkSelect
              listLabel={pageSizeControl.listLabel}
              buttonAriaLabel={pageSizeControl.buttonAriaLabel ?? pageSizeControl.listLabel}
              options={pageSizeControl.options}
              value={
                Number.isFinite(pageSizeControl.value) ? String(pageSizeControl.value) : ""
              }
              disabled={pageSizeControl.disabled}
              portaled
              size="sm"
              showCheckmarks={false}
              className="w-auto shrink-0"
              onChange={(v) => {
                const parsed = Number.parseInt(v, 10);
                const allowed = new Set(
                  pageSizeControl.options.map((o) => Number.parseInt(o.value, 10)),
                );
                pageSizeControl.onChange(
                  allowed.has(parsed) ? parsed : normalizeListPageSize(parsed),
                );
              }}
            />
          ) : null}
          {showPageNav ? (
            <>
              <button
                type="button"
                className={cn(btnBase, "px-2.5")}
                disabled={current_page <= 1}
                onClick={onPrev}
              >
                {prevLabel}
              </button>
              <div className="flex items-center gap-0.5">
                {pages.map((p, i) =>
                  p === "ellipsis" ? (
                    <span
                      key={`e-${i}`}
                      className="inline-flex h-8 min-w-6 items-center justify-center px-0.5 text-xs text-slate-400"
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={cn(
                        btnBase,
                        "size-8 min-h-8 min-w-8 px-0 tabular-nums",
                        p === current_page && activeBtn,
                      )}
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
