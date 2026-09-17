"use client";

import * as React from "react";
import { cn } from "@/core/utils/http.util";

export const listMassSelectionRowCheckboxClassName = cn(
  "h-3.5 w-3.5 shrink-0 cursor-pointer rounded-[3px] border-slate-300",
  "text-[color:var(--dash-accent,#111)] accent-[color:var(--dash-accent,#111)]",
  "focus-visible:ring-1 focus-visible:ring-slate-400/50 focus-visible:ring-offset-0",
  "dark:border-slate-600 dark:bg-slate-900",
);

function selectablePageIds<T extends { id: number }>(
  pageItems: T[],
  isRowSelectable?: (item: T) => boolean,
): number[] {
  return pageItems
    .filter((row) => (isRowSelectable ? isRowSelectable(row) : true))
    .map((row) => row.id);
}

type Args<T extends { id: number }> = {
  pageItems: T[];
  /** When filters change, selection is cleared. Page changes are not included — selections persist across pages. */
  resetDeps: React.DependencyList;
  isRowSelectable?: (item: T) => boolean;
  /** @deprecated Select all applies to the current page only. */
  totalRecords?: number;
  /** @deprecated Select all applies to the current page only. */
  fetchAllIds?: () => Promise<number[]>;
  /** @deprecated Select all applies to the current page only. */
  onSelectAllError?: () => void;
};

export function useListMassSelection<T extends { id: number }>({
  pageItems,
  isRowSelectable,
  resetDeps,
}: Args<T>) {
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(() => new Set());
  const selectAllRef = React.useRef<HTMLInputElement>(null);

  const pageSelectableIds = React.useMemo(
    () => selectablePageIds(pageItems, isRowSelectable),
    [pageItems, isRowSelectable],
  );

  const selectedCount = selectedIds.size;
  const allMatchingSelected =
    pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageSelectableIds.some((id) => selectedIds.has(id));

  React.useEffect(() => {
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-provided reset keys
  }, resetDeps);

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allMatchingSelected;
    }
  }, [somePageSelected, allMatchingSelected]);

  const toggleSelectAll = React.useCallback(async () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allPageSelected =
        pageSelectableIds.length > 0 && pageSelectableIds.every((id) => next.has(id));
      if (allPageSelected) {
        for (const id of pageSelectableIds) next.delete(id);
      } else {
        for (const id of pageSelectableIds) next.add(id);
      }
      return next;
    });
  }, [pageSelectableIds]);

  const toggleRowSelected = React.useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = React.useCallback((id: number) => selectedIds.has(id), [selectedIds]);

  return {
    selectedIds,
    selectedCount,
    allMatchingSelected,
    somePageSelected,
    selectingAll: false,
    selectAllRef,
    toggleSelectAll,
    toggleRowSelected,
    clearSelection,
    isSelected,
    rowCheckboxClassName: listMassSelectionRowCheckboxClassName,
  };
}
