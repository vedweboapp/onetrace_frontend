"use client";

import * as React from "react";
import type { ListUrlUpdates, SetListUrlOptions } from "@/shared/hooks/use-list-url-state";

type SetListUrl = (updates: ListUrlUpdates, opts?: SetListUrlOptions) => void;

export type ListEmptyStateKind = "none" | "onboarding" | "filtered" | "activeOnly";

type Args = {
  loading: boolean;
  loadError: string | null;
  itemsLength: number;
  isActiveParam: string | null;
  isActiveFilter: boolean;
  hasActiveFilters: boolean;
  setUrl: SetListUrl;
  /** Return total inactive record count (same filters as list, except is_active: false). */
  countInactive: () => Promise<number>;
};

/**
 * Handles list empty states when the default active-only view has no rows but inactive rows exist:
 * - Auto-switch to inactive on first load (so users still see their data).
 * - Keep filters visible; show “no active records” when the user switches back to Active.
 * - Onboarding empty only when there are no active and no inactive records.
 */
export function useListActiveInactiveEmptyState({
  loading,
  loadError,
  itemsLength,
  isActiveParam,
  isActiveFilter,
  hasActiveFilters,
  setUrl,
  countInactive,
}: Args) {
  const [inactiveCount, setInactiveCount] = React.useState<number | null>(null);
  const [checkingInactive, setCheckingInactive] = React.useState(false);
  const skipAutoFallbackRef = React.useRef(false);
  const prevIsActiveParamRef = React.useRef(isActiveParam);

  const viewingActiveOnly = isActiveFilter && isActiveParam !== "false";

  React.useEffect(() => {
    if (prevIsActiveParamRef.current === "false" && isActiveParam !== "false") {
      skipAutoFallbackRef.current = true;
    }
    if (isActiveParam === "false") {
      skipAutoFallbackRef.current = false;
    }
    prevIsActiveParamRef.current = isActiveParam;
  }, [isActiveParam]);

  React.useEffect(() => {
    if (loading || loadError || itemsLength > 0 || !viewingActiveOnly) {
      if (itemsLength > 0 || isActiveParam === "false") {
        setInactiveCount(null);
        setCheckingInactive(false);
      }
      return;
    }

    let cancelled = false;
    setCheckingInactive(true);
    (async () => {
      try {
        const count = await countInactive();
        if (cancelled) return;
        setInactiveCount(count);
        if (count > 0 && !skipAutoFallbackRef.current) {
          setUrl({ is_active: "false", page: null }, { replace: true });
        }
      } catch {
        if (!cancelled) setInactiveCount(0);
      } finally {
        if (!cancelled) setCheckingInactive(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, loadError, itemsLength, viewingActiveOnly, isActiveParam, countInactive, setUrl]);

  const listLoading = loading || checkingInactive;

  const emptyStateKind: ListEmptyStateKind = React.useMemo(() => {
    if (listLoading || loadError || itemsLength > 0) return "none";
    if (hasActiveFilters) return "filtered";
    if (viewingActiveOnly && inactiveCount === null) return "none";
    if (viewingActiveOnly && (inactiveCount ?? 0) > 0) {
      return skipAutoFallbackRef.current ? "activeOnly" : "none";
    }
    return "onboarding";
  }, [
    listLoading,
    loadError,
    itemsLength,
    hasActiveFilters,
    viewingActiveOnly,
    inactiveCount,
  ]);

  const hideListChrome = emptyStateKind === "onboarding";

  const filtersActive = hasActiveFilters || emptyStateKind === "activeOnly";

  const switchToInactive = React.useCallback(() => {
    setUrl({ is_active: "false", page: null }, { replace: true });
  }, [setUrl]);

  return {
    hideListChrome,
    listLoading,
    emptyStateKind,
    filtersActive,
    switchToInactive,
  };
}
