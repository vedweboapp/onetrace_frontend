"use client";

import * as React from "react";
import {
  applyTabOrder,
  clearStoredTabOrder,
  moveTabOrderItem,
  readStoredTabOrder,
  writeStoredTabOrder,
} from "@/shared/utils/tab-order.util";

/**
 * Persists tab order in localStorage (per storageKey — typically user-scoped).
 * Applies across every screen that shares the same key (e.g. all project details).
 */
export function usePersistedTabOrder(storageKey: string, defaultIds: readonly string[]) {
  const defaultKey = defaultIds.join("\0");
  const [order, setOrder] = React.useState<string[]>(() => [...defaultIds]);

  React.useEffect(() => {
    const defaults = defaultKey.split("\0").filter(Boolean);
    setOrder(applyTabOrder(defaults, readStoredTabOrder(storageKey)));
  }, [storageKey, defaultKey]);

  const setOrderAndPersist = React.useCallback(
    (next: string[] | ((prev: string[]) => string[])) => {
      setOrder((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        const merged = applyTabOrder(
          defaultKey.split("\0").filter(Boolean),
          resolved,
        );
        writeStoredTabOrder(storageKey, merged);
        return merged;
      });
    },
    [storageKey, defaultKey],
  );

  const move = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      setOrderAndPersist((prev) => moveTabOrderItem(prev, fromIndex, toIndex));
    },
    [setOrderAndPersist],
  );

  const reset = React.useCallback(() => {
    clearStoredTabOrder(storageKey);
    setOrder(defaultKey.split("\0").filter(Boolean));
  }, [storageKey, defaultKey]);

  const isCustom = React.useMemo(() => {
    const defaults = defaultKey.split("\0").filter(Boolean);
    if (order.length !== defaults.length) return true;
    return order.some((id, i) => id !== defaults[i]);
  }, [order, defaultKey]);

  return { order, setOrder: setOrderAndPersist, move, reset, isCustom };
}
