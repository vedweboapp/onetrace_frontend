"use client";

import * as React from "react";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { isApiNotFoundError } from "@/core/errors/api-not-found.util";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";

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
  const [notFound, setNotFound] = React.useState(false);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const retry = React.useCallback(() => setRefreshNonce((k) => k + 1), []);
  const fetchRef = React.useRef(fetch);
  fetchRef.current = fetch;
  const loadErrorRef = React.useRef(loadError);
  loadErrorRef.current = loadError;
  const entityIdRef = React.useRef(entityId);
  entityIdRef.current = entityId;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setDetail(null);
      try {
        const row = await fetchRef.current(entityId);
        if (!cancelled) setDetail(row);
      } catch (err) {
        if (!cancelled) {
          if (isApiNotFoundError(err)) {
            setNotFound(true);
          } else {
            setError(loadErrorRef.current);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityId, refreshNonce]);

  /** Refetch without clearing the current detail / flashing the loading skeleton. */
  const reloadQuiet = React.useCallback(async () => {
    const id = entityIdRef.current;
    try {
      const row = await fetchRef.current(id);
      if (entityIdRef.current === id) {
        setDetail(row);
        setError(null);
        setNotFound(false);
      }
    } catch {
      /* Keep showing the last good detail. */
    }
  }, []);

  return { detail, loading, error, notFound, retry, reloadQuiet, dateFmt };
}

/** PATCH + toast + refresh for Zoho-style detail inline edit (one hook, no duplicated try/catch). */
export function useDetailPatch<TBody>(
  save: (body: TBody) => Promise<unknown>,
  messages: { success: string; error: string },
  onSaved?: () => void,
): (body: TBody) => Promise<void> {
  const saveRef = React.useRef(save);
  saveRef.current = save;
  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;
  const onSavedRef = React.useRef(onSaved);
  onSavedRef.current = onSaved;

  return React.useCallback(async (body: TBody) => {
    try {
      await saveRef.current(body);
      toastSuccess(messagesRef.current.success);
      onSavedRef.current?.();
    } catch (error) {
      toastApiError(error, messagesRef.current.error);
      throw error;
    }
  }, []);
}
