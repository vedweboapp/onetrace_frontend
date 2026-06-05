"use client";

import * as React from "react";
import { cn } from "@/core/utils/http.util";

export const listMassSelectionRowCheckboxClassName = cn(
  "h-3.5 w-3.5 shrink-0 cursor-pointer rounded-[3px] border-slate-300",
  "text-[color:var(--dash-accent,#111)] accent-[color:var(--dash-accent,#111)]",
  "focus-visible:ring-1 focus-visible:ring-slate-400/50 focus-visible:ring-offset-0",
  "dark:border-slate-600 dark:bg-slate-900",
);

type Args = {
  totalRecords: number;
  pageItems: Array<{ id: number }>;
  fetchAllIds: () => Promise<number[]>;
  /** When filters/page change, selection is cleared */
  resetDeps: React.DependencyList;
  onSelectAllError?: () => void;
};

export function useListMassSelection({
  totalRecords,
  pageItems,
  fetchAllIds,
  resetDeps,
  onSelectAllError,
}: Args) {
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(() => new Set());
  const [selectingAll, setSelectingAll] = React.useState(false);
  const selectAllRef = React.useRef<HTMLInputElement>(null);

  const selectedCount = selectedIds.size;
  const allMatchingSelected = totalRecords > 0 && selectedCount === totalRecords;
  const somePageSelected = pageItems.some((row) => selectedIds.has(row.id));

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
    if (allMatchingSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectingAll(true);
    try {
      const ids = await fetchAllIds();
      setSelectedIds(new Set(ids));
    } catch {
      onSelectAllError?.();
    } finally {
      setSelectingAll(false);
    }
  }, [allMatchingSelected, fetchAllIds, onSelectAllError]);

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
    selectingAll,
    selectAllRef,
    toggleSelectAll,
    toggleRowSelected,
    clearSelection,
    isSelected,
    rowCheckboxClassName: listMassSelectionRowCheckboxClassName,
  };
}
