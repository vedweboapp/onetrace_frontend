"use client";

import * as React from "react";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";

type UseEntityDetailScreenArgs<T> = {
  entityId: number;
  fetch: (id: number) => Promise<T>;
  loadError: string;
};

export function useEntityDetailScreen<T>({ entityId, fetch, loadError }: UseEntityDetailScreenArgs<T>) {
  const dateFmt = useDashboardDateFormat();
  const [detail, setDetail] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const retry = React.useCallback(() => setRefreshNonce((k) => k + 1), []);
  const fetchRef = React.useRef(fetch);
  fetchRef.current = fetch;
  const loadErrorRef = React.useRef(loadError);
  loadErrorRef.current = loadError;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const row = await fetchRef.current(entityId);
        if (!cancelled) setDetail(row);
      } catch {
        if (!cancelled) setError(loadErrorRef.current);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityId, refreshNonce]);

  return { detail, loading, error, retry, dateFmt };
}
