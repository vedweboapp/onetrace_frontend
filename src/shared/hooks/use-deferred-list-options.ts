"use client";

import * as React from "react";
import type { DropdownCatalogKind } from "@/shared/catalog/dropdown-catalog-bus";
import { useDropdownCatalogEpoch } from "@/shared/catalog/use-dropdown-catalog-epoch";

export type DeferredListOption = { value: string; label: string };

export function useDeferredListOptions(
  load: () => Promise<DeferredListOption[]>,
  enabled: boolean,
  reloadKey = 0,
  catalogKinds: readonly DropdownCatalogKind[] = [],
): { options: DeferredListOption[]; loading: boolean } {
  const catalogEpoch = useDropdownCatalogEpoch(catalogKinds);
  const [options, setOptions] = React.useState<DeferredListOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const loadRef = React.useRef(load);
  loadRef.current = load;

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    void loadRef
      .current()
      .then((items) => {
        if (!cancelled) setOptions(items);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, reloadKey, catalogEpoch]);

  return { options, loading };
}
