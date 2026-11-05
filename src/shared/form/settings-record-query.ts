"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

/** Query used to open a settings catalog row’s detail drawer in a new tab. */
export const SETTINGS_RECORD_QUERY = "record";

export function settingsRecordHref(listPath: string, id: number): string {
  const sep = listPath.includes("?") ? "&" : "?";
  return `${listPath}${sep}${SETTINGS_RECORD_QUERY}=${id}`;
}

/**
 * When the list URL contains `?record={id}`, load that row and open its detail drawer.
 */
export function useOpenSettingsRecord<T>(
  fetchRecord: (id: number) => Promise<T>,
  onOpen: (row: T) => void,
) {
  const searchParams = useSearchParams();
  const raw = searchParams.get(SETTINGS_RECORD_QUERY);
  const fetchRef = React.useRef(fetchRecord);
  const onOpenRef = React.useRef(onOpen);
  fetchRef.current = fetchRecord;
  onOpenRef.current = onOpen;

  React.useEffect(() => {
    if (!raw || !/^\d+$/.test(raw)) return;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    let cancelled = false;
    void fetchRef
      .current(id)
      .then((row) => {
        if (!cancelled) onOpenRef.current(row);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [raw]);
}
