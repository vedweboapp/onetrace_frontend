"use client";

import * as React from "react";

export type DeferredListOption = { value: string; label: string };

export function useDeferredListOptions(
  load: () => Promise<DeferredListOption[]>,
  enabled: boolean,
): { options: DeferredListOption[]; loading: boolean } {
  const [options, setOptions] = React.useState<DeferredListOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const loadRef = React.useRef(load);
  loadRef.current = load;
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;
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
  }, [enabled]);

  return { options, loading };
}
