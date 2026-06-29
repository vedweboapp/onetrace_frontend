"use client";

import * as React from "react";
import { fetchMaterialStatusesPage } from "@/features/material-status/api/material-status.api";
import { normalizeMaterialRequestStatus } from "@/features/material-requests/utils/material-request-nested-fields.util";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";

export type MaterialStatusCatalog = {
  byKey: Record<string, WorkflowColourStatus>;
  options: { value: string; label: string }[];
  labelFor: (code: string | null | undefined) => string;
  rowFor: (code: string | null | undefined) => WorkflowColourStatus | null;
  loading: boolean;
};

export function buildMaterialStatusCatalog(items: WorkflowColourStatus[]): Omit<MaterialStatusCatalog, "loading"> {
  const byKey: Record<string, WorkflowColourStatus> = {};
  const options: { value: string; label: string }[] = [];

  for (const row of items) {
    const key = normalizeMaterialRequestStatus(row.status_name);
    if (!key) continue;
    byKey[key] = row;
    options.push({ value: key, label: row.status_name });
  }

  const labelFor = (code: string | null | undefined): string => {
    const key = normalizeMaterialRequestStatus(code);
    if (!key) return "—";
    return byKey[key]?.status_name ?? code?.trim() ?? "—";
  };

  const rowFor = (code: string | null | undefined): WorkflowColourStatus | null => {
    const key = normalizeMaterialRequestStatus(code);
    if (!key) return null;
    return byKey[key] ?? null;
  };

  return { byKey, options, labelFor, rowFor };
}

export function useMaterialStatusCatalog(enabled = true): MaterialStatusCatalog {
  const [catalog, setCatalog] = React.useState<Omit<MaterialStatusCatalog, "loading">>(() =>
    buildMaterialStatusCatalog([]),
  );
  const [loading, setLoading] = React.useState(enabled);
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const { items } = await fetchMaterialStatusesPage(1, 500);
        if (!cancelled) setCatalog(buildMaterialStatusCatalog(items));
      } catch {
        if (!cancelled) setCatalog(buildMaterialStatusCatalog([]));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { ...catalog, loading: enabled ? loading : false };
}
