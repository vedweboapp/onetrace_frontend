"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { massActionConfigFor, type MassActionResourceKey } from "./mass-action-config";
import type { MassUpdateFieldDef } from "./types";
import { useListMassSelection } from "./use-list-mass-selection";

type Args = {
  resource: MassActionResourceKey;
  totalRecords: number;
  pageItems: Array<{ id: number }>;
  fetchAllIds: () => Promise<number[]>;
  resetDeps: React.DependencyList;
  updateFields: MassUpdateFieldDef[];
  onApplied: () => void;
};

export function useEntityListMassActions({
  resource,
  totalRecords,
  pageItems,
  fetchAllIds,
  resetDeps,
  updateFields,
  onApplied,
}: Args) {
  const tMass = useTranslations("Dashboard.massActions");
  const config = React.useMemo(() => massActionConfigFor(resource), [resource]);

  const selection = useListMassSelection({
    totalRecords,
    pageItems,
    fetchAllIds,
    resetDeps,
    onSelectAllError: () => toastError(tMass("selectAllError")),
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
