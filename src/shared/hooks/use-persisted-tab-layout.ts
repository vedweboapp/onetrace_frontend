"use client";

import * as React from "react";
import { appearanceDefaultTabLayout, useTabLayoutsStore } from "@/shared/store/tab-layouts.store";
import { scheduleTabLayoutsPersist } from "@/shared/utils/persist-tab-layouts";
import {
  applyTabLayout,
  clearStoredTabLayout,
  layoutsAreEqual,
  readStoredTabLayout,
  tabLayoutScopeFromStorageKey,
  visibleTabIds,
  writeStoredTabLayout,
  type TabLayoutChoice,
  moveTabOrderItem,
} from "@/shared/utils/tab-layout.util";

/**
 * Resolve layout for a scope:
 * 1) User preference in store (from profile hydrate / local edit)
 * 2) localStorage for this user key
 * 3) Appearance-setting defaults (catalog)
 * 4) Screen `defaultIds` when nothing else exists
 */
function resolveSavedLayout(
  scope: string,
  storageKey: string,
  fromStore: TabLayoutChoice | undefined,
): TabLayoutChoice | null {
  if (fromStore) return fromStore;
  const local = readStoredTabLayout(storageKey);
  if (local) return local;
  return appearanceDefaultTabLayout(scope);
}

export function usePersistedTabLayout(
  storageKey: string,
  defaultIds: readonly string[],
  pinnedIds: readonly string[] = [],
) {
  const defaultKey = defaultIds.join("\0");
  const scope = React.useMemo(() => tabLayoutScopeFromStorageKey(storageKey), [storageKey]);
  const fromStore = useTabLayoutsStore((s) => s.layouts[scope]);

  const appearanceBaseline = React.useMemo(() => {
    const defaults = defaultKey.split("\0").filter(Boolean);
    return applyTabLayout(defaults, appearanceDefaultTabLayout(scope));
  }, [defaultKey, scope]);

  const resolved = React.useMemo(() => {
    const defaults = defaultKey.split("\0").filter(Boolean);
    const saved = resolveSavedLayout(scope, storageKey, fromStore);
    return applyTabLayout(defaults, saved);
  }, [defaultKey, fromStore, scope, storageKey]);

  const persist = React.useCallback(
    (layout: TabLayoutChoice) => {
      const defaults = defaultKey.split("\0").filter(Boolean);
      const next = applyTabLayout(defaults, layout);
      writeStoredTabLayout(storageKey, next);
      useTabLayoutsStore.getState().setScopeLayout(scope, next);
      scheduleTabLayoutsPersist();
    },
    [defaultKey, scope, storageKey],
  );

  const move = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      persist({
        order: moveTabOrderItem(resolved.order, fromIndex, toIndex),
        // Hide/show UI removed — never re-persist hidden tabs.
        hidden: [],
      });
    },
    [persist, resolved.order],
  );

  const setHidden = React.useCallback(
    (tabId: string, hidden: boolean) => {
      if (pinnedIds.includes(tabId) && hidden) return;
      const nextHidden = new Set(resolved.hidden);
      if (hidden) nextHidden.add(tabId);
      else nextHidden.delete(tabId);
      const next: TabLayoutChoice = { order: resolved.order, hidden: [...nextHidden] };
      const visible = visibleTabIds(next, pinnedIds);
      if (visible.length === 0) return;
      persist(next);
    },
    [persist, pinnedIds, resolved.hidden, resolved.order],
  );

  const reset = React.useCallback(() => {
    clearStoredTabLayout(storageKey);
    const next = appearanceBaseline;
    writeStoredTabLayout(storageKey, next);
    useTabLayoutsStore.getState().setScopeLayout(scope, next);
    scheduleTabLayoutsPersist();
  }, [appearanceBaseline, scope, storageKey]);

  const isCustom = !layoutsAreEqual(resolved, appearanceBaseline);
  const visibleIds = React.useMemo(
    () => visibleTabIds(resolved, pinnedIds),
    [resolved, pinnedIds],
  );

  return {
    order: resolved.order,
    hidden: resolved.hidden,
    visibleIds,
    isCustom,
    move,
    setHidden,
    reset,
  };
}
