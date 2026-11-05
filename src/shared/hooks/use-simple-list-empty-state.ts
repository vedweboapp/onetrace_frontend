"use client";

import * as React from "react";
import type { ListEmptyStateKind } from "@/shared/hooks/use-list-active-inactive-empty";

type Args = {
  loading: boolean;
  loadError: string | null;
  itemsLength: number;
  hasActiveFilters: boolean;
};

/**
 * Onboarding vs filtered empty states for lists without active/inactive record filtering.
 * Header chrome (search, Import, Add) stays visible so empty pages keep the same actions.
 */
export function useSimpleListEmptyState({ loading, loadError, itemsLength, hasActiveFilters }: Args) {
  const emptyStateKind: ListEmptyStateKind = React.useMemo(() => {
    if (loading || loadError || itemsLength > 0) return "none";
    if (hasActiveFilters) return "filtered";
    return "onboarding";
  }, [loading, loadError, itemsLength, hasActiveFilters]);

  const hideListChrome = false;
  const filtersActive = hasActiveFilters;

  return {
    hideListChrome,
    listLoading: loading,
    emptyStateKind,
    filtersActive,
  };
}
