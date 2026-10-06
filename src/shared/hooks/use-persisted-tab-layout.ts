"use client";

import * as React from "react";
import { useTabLayoutsStore } from "@/shared/store/tab-layouts.store";
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

export function usePersistedTabLayout(
  storageKey: string,
  defaultIds: readonly string[],
  pinnedIds: readonly string[] = [],
) {
  const defaultKey = defaultIds.join("\0");
  const scope = React.useMemo(() => tabLayoutScopeFromStorageKey(storageKey), [storageKey]);
  const fromStore = useTabLayoutsStore((s) => s.layouts[scope]);

  const resolved = React.useMemo(() => {
    const defaults = defaultKey.split("\0").filter(Boolean);
    const saved = fromStore ?? readStoredTabLayout(storageKey);
    return applyTabLayout(defaults, saved);
  }, [defaultKey, fromStore, storageKey]);

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
        hidden: resolved.hidden,
      });
    },
    [persist, resolved.hidden, resolved.order],
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
    const defaults = defaultKey.split("\0").filter(Boolean);
    const next: TabLayoutChoice = { order: defaults, hidden: [] };
    useTabLayoutsStore.getState().setScopeLayout(scope, next);
    scheduleTabLayoutsPersist();
  }, [defaultKey, scope, storageKey]);

  const defaultLayout = React.useMemo(
    () => applyTabLayout(defaultKey.split("\0").filter(Boolean), { order: [], hidden: [] }),
    [defaultKey],
  );

  const isCustom = !layoutsAreEqual(resolved, defaultLayout);
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
