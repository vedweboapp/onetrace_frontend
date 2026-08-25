"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import {
  accentFilledControlClassName,
  compactControlBtnClassName,
} from "@/shared/config/design-tokens";
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

/** Compact paginated table footer (single row, pinned under the scroll body). */
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

  const btnBase = compactControlBtnClassName;

  const activeBtn = accentFilledControlClassName;

  return (
    <div
      className={cn(
        "flex min-h-11 shrink-0 items-center border-t border-slate-200/90 bg-slate-50/80 px-3 py-2.5 sm:px-4 sm:py-3",
        "dark:border-slate-800 dark:bg-slate-900/50",
        className,
      )}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 truncate text-xs leading-5 text-slate-600 dark:text-slate-400">
          {summary}
        </p>
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
          {showNumberButtons ? (
            <>
              <button
                type="button"
                className={cn(btnBase, "px-2")}
                disabled={current_page <= 1}
                onClick={onPrev}
              >
                {prevLabel}
              </button>
              <div className="flex items-center gap-0.5">
                {pages.map((p, i) =>
                  p === "ellipsis" ? (
                    <span key={`e-${i}`} className="px-0.5 text-slate-400" aria-hidden>
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
                className={cn(btnBase, "px-2")}
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
