"use client";

import * as React from "react";
import { fetchMaterialStatusesPage } from "@/features/material-status/api/material-status.api";
import {
  getMaterialRequestStatusId,
  normalizeMaterialRequestStatus,
} from "@/features/material-requests/utils/material-request-nested-fields.util";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";

type StatusCode = string | number | { id?: number; name?: string; status_name?: string } | null | undefined;

export type MaterialStatusCatalog = {
  byKey: Record<string, WorkflowColourStatus>;
  byId: Record<number, WorkflowColourStatus>;
  options: { value: string; label: string }[];
  labelFor: (code: StatusCode) => string;
  rowFor: (code: StatusCode) => WorkflowColourStatus | null;
  loading: boolean;
};

export function buildMaterialStatusCatalog(items: WorkflowColourStatus[]): Omit<MaterialStatusCatalog, "loading"> {
  const byKey: Record<string, WorkflowColourStatus> = {};
  const byId: Record<number, WorkflowColourStatus> = {};
  const options: { value: string; label: string }[] = [];

  for (const row of items) {
    if (!(row.id > 0)) continue;
    byId[row.id] = row;
    options.push({ value: String(row.id), label: row.status_name });
    const key = normalizeMaterialRequestStatus(row.status_name);
    if (key) byKey[key] = row;
  }

  const resolveRow = (code: StatusCode): WorkflowColourStatus | null => {
    const id = getMaterialRequestStatusId(code);
    if (id != null && byId[id]) return byId[id];
    const key = normalizeMaterialRequestStatus(code);
    if (key && byKey[key]) return byKey[key];
    return null;
  };

  const labelFor = (code: StatusCode): string => {
    const row = resolveRow(code);
    if (row?.status_name?.trim()) return row.status_name.trim();
    if (typeof code === "object" && code) {
      const name = code.name || code.status_name;
      if (typeof name === "string" && name.trim()) return name.trim();
    }
    if (typeof code === "string" && code.trim() && !/^\d+$/.test(code.trim())) return code.trim();
    return "—";
  };

  const rowFor = (code: StatusCode): WorkflowColourStatus | null => resolveRow(code);

  return { byKey, byId, options, labelFor, rowFor };
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
