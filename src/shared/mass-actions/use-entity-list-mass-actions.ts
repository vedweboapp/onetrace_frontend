"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { massActionConfigFor, type MassActionResourceKey } from "./mass-action-config";
import type { MassUpdateFieldDef } from "./types";
import { useListMassSelection } from "./use-list-mass-selection";

type Args<T extends { id: number }> = {
  resource: MassActionResourceKey;
  pageItems: T[];
  resetDeps: React.DependencyList;
  updateFields: MassUpdateFieldDef[];
  onApplied: () => void;
  isRowSelectable?: (item: T) => boolean;
  /** @deprecated Select all applies to the current page only. */
  totalRecords?: number;
  /** @deprecated Select all applies to the current page only. */
  fetchAllIds?: () => Promise<number[]>;
};

export function useEntityListMassActions<T extends { id: number }>({
  resource,
  pageItems,
  resetDeps,
  updateFields,
  onApplied,
  isRowSelectable,
}: Args<T>) {
  const tMass = useTranslations("Dashboard.massActions");
  const config = React.useMemo(() => massActionConfigFor(resource), [resource]);

  const selection = useListMassSelection({
    pageItems,
    isRowSelectable,
    resetDeps,
  });

  const clearSelection = selection.clearSelection;

  const handleMassSuccess = React.useCallback(() => {
    toastSuccess(tMass("success"));
    clearSelection();
    onApplied();
  }, [onApplied, clearSelection, tMass]);

  const selectedIds = React.useMemo(() => [...selection.selectedIds], [selection.selectedIds]);

  return {
    config,
    updateFields,
    selection,
    selectedIds,
    selectedCount: selection.selectedCount,
    handleMassSuccess,
    selectAllAriaLabel: tMass("selectAll"),
    selectRowAriaLabel: tMass("selectRow"),
  };
}
