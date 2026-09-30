"use client";

import * as React from "react";
import {
  subscribeDropdownCatalogChanged,
  type DropdownCatalogKind,
} from "@/shared/catalog/dropdown-catalog-bus";

/** Increments when a matching catalog is created, updated, or deleted. */
export function useDropdownCatalogEpoch(kinds: readonly DropdownCatalogKind[]): number {
  const [epoch, setEpoch] = React.useState(0);
  const kindsKey = kinds.join(",");
  React.useEffect(() => {
    const wanted = new Set(kindsKey.split(",").filter(Boolean) as DropdownCatalogKind[]);
    return subscribeDropdownCatalogChanged((kind) => {
      if (wanted.has(kind)) setEpoch((n) => n + 1);
    });
  }, [kindsKey]);
  return epoch;
}

/**
 * Re-runs `refresh` after a matching catalog changes.
 * The first run is skipped so the screen's own initial load stays in charge.
 */
export function useRefreshOnCatalogChange(
  kinds: readonly DropdownCatalogKind[],
  refresh: () => void | Promise<void>,
): void {
  const epoch = useDropdownCatalogEpoch(kinds);
  const refreshRef = React.useRef(refresh);
  refreshRef.current = refresh;
  const seenEpoch = React.useRef(epoch);

  React.useEffect(() => {
    if (seenEpoch.current === epoch) return;
    seenEpoch.current = epoch;
    void refreshRef.current();
  }, [epoch]);
}
