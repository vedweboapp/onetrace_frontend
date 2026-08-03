"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { DetailEntityLink } from "@/shared/components/entity";
import {
  createDispatchReturnRequest,
  fetchWorkerReturnMaterials,
} from "@/features/dispatches/api/dispatch.api";
import type { DispatchReturnType } from "@/features/dispatches/types/dispatch.types";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { cn } from "@/core/utils/http.util";
import { toastSuccess, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import {
  AppButton,
  CheckmarkSelect,
  SurfaceShell,
  surfaceInputClassName,
  surfaceTextareaClassName,
} from "@/shared/ui";
import {
  quantityTableCellClass,
  quantityTableHeaderClass,
  quantityTableInputCellClass,
  QuantityWithUnits,
} from "@/shared/components/quantity/quantity-table-columns";



type LineDraft = {
  returnQty: string;
  returnType: DispatchReturnType;
  reason: string;
};

type Props = {
  initialWorkerId?: number | null;
  initialMaterialRequestId?: number | null;
};

const compactInputClass = cn(surfaceInputClassName, "h-9 min-h-9 rounded-md px-2.5 py-1.5 text-sm shadow-sm");

export function ReturnToStockCreateScreen({
  initialWorkerId = null,
  initialMaterialRequestId = null,
}: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const router = useRouter();
  const searchParams = useSearchParams();
  const listBack = resolveFormBackUrl(searchParams.get("back"), "return-to-stock", routes.dashboard.returnToStock);

  const [workerId, setWorkerId] = React.useState(
    initialWorkerId != null && initialWorkerId > 0 ? String(initialWorkerId) : "",
  );
  const [workerOptions, setWorkerOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [materials, setMaterials] = React.useState<MappedDispatch[] | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, LineDraft>>({});

  const returnTypeOptions = React.useMemo(
    () => [
      { value: "unused", label: t("return.typeUnused") },
      { value: "faulty", label: t("return.typeFaulty") },
    ],
    [t],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const workers = await loadTechnicianOptions();
        if (!cancelled) setWorkerOptions(workers);
      } catch (error) {
        if (!cancelled) setWorkerOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMaterials() {
    const worker = Number.parseInt(workerId, 10);
    if (!Number.isFinite(worker) || worker <= 0) {
      setLoadError(t("return.workerRequired"));
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchWorkerReturnMaterials({
        worker_name: worker,
      });
      const mapped = mapDispatches(data);
      setMaterials(mapped);
      const initial: Record<string, LineDraft> = {};
      for (const d of mapped) {
        for (const line of d.lines || []) {
          const key = `dispatch:${d.id}:line:${line.id}`;
          initial[key] = {
            returnQty: "",
            returnType: "unused",
            reason: "",
          };
        }
      }
      setDrafts(initial);
    } catch (error) {
      setLoadError(getApiErrorDisplayMessage(error, t("return.loadError")));
      setMaterials(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!workerId || loading) return;
    if (initialWorkerId != null) void loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial worker from URL
  }, [workerId]);

  function updateDraft(key: string, patch: Partial<LineDraft>) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  const flatLines = React.useMemo(() => {
    if (!materials) return [];
    return materials.flatMap((d) =>
      (d.lines || []).map((line) => {
        const dispatchedQty = line.quantity ?? 0;
        const returnedQty = line.returned_quantity ?? 0;
        const returnableQty = Math.max(0, dispatchedQty - returnedQty);

        return {
          ...line,
          dispatch_id: d.id,
          dispatch_order_number: d.dispatch_order_number,
          dispatched_quantity: dispatchedQty,
          returned_quantity: returnedQty,
          returnable_quantity: returnableQty,
          draftKey: `dispatch:${d.id}:line:${line.id}`,
        };
      })
    );
  }, [materials]);

  async function handleSubmitRequest() {
    const worker = Number.parseInt(workerId, 10);
    if (!materials || !Number.isFinite(worker)) return;

    const lines = flatLines.flatMap((row) => {
      const draft = drafts[row.draftKey];
      const quantity = Number.parseFloat(draft?.returnQty?.trim() ?? "");
      if (!Number.isFinite(quantity) || quantity <= 0) return [];
      return [{
        dispatch_line: row.id,
        quantity,
        return_type: draft?.returnType ?? "unused",
        reason: draft?.reason?.trim() || undefined,
      }];
    });

    if (lines.length === 0) return;

    setSubmitting(true);
    try {
      await createDispatchReturnRequest({ lines });
      toastSuccess(t("return.requestSubmittedToast"));
      router.replace(listBack);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmitRequest = flatLines.some((row) => {
    const qty = Number.parseFloat(drafts[row.draftKey]?.returnQty?.trim() ?? "");
    return Number.isFinite(qty) && qty > 0;
  });

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={t("return.newRequestTitle")}
        subtitle={t("return.newRequestSubtitle")}
        backHref={listBack}
        backAriaLabel={t("return.backAria")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={submitting}
              onClick={() => router.push(listBack)}
            >
              {t("return.cancel")}
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={submitting}
              disabled={!canSubmitRequest || submitting}
              onClick={() => void handleSubmitRequest()}
            >
              {t("return.submitRequest")}
            </AppButton>
          </div>
        }
      />

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        <div className="space-y-6 p-4 sm:p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{t("return.operatorHint")}</p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[10rem] flex-1 sm:max-w-xs">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("table.workerName")}
                </label>
                <CheckmarkSelect
                  listLabel={t("table.workerName")}
                  buttonAriaLabel={t("table.workerName")}
                  options={workerOptions}
                  value={workerId}
                  emptyLabel={t("return.selectWorker")}
                  portaled
                  searchable
                  className="w-full"
                  onChange={setWorkerId}
                />
              </div>
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                loading={loading}
                className="shrink-0"
                onClick={() => void loadMaterials()}
              >
                {t("return.loadMaterials")}
              </AppButton>
            </div>
          </div>

          {loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : loading ? (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : !materials ? (
            <p className="text-sm text-slate-500">{t("return.selectWorkerHint")}</p>
          ) : flatLines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
              {t("return.empty")}
            </p>
          ) : (
            <div className="space-y-6">
              {materials.map((d) => {
                if (!d.lines || d.lines.length === 0) return null;

                return (
                  <div key={d.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Dispatch Record
                        </span>
                        <DetailEntityLink
                          href={`${routes.dashboard.dispatches}/${d.id}`}
                          className="font-bold text-slate-900 hover:underline dark:text-slate-100"
                        >
                          {d.dispatch_order_number}
                        </DetailEntityLink>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {d.dispatch_date}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] table-fixed text-left text-sm">
                        <colgroup>
                          <col />
                          <col className="w-28" />
                          <col className="w-28" />
                          <col className="w-28" />
                          <col className="w-44" />
                          <col className="w-72" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                            <th className="px-4 py-2">{t("table.materialItem")}</th>
                            <th className={cn(quantityTableHeaderClass, "px-4 py-2")}>{t("table.extra")}</th>
                            <th className={cn(quantityTableHeaderClass, "px-4 py-2")}>{t("return.alreadyReturned")}</th>
                            <th className={cn(quantityTableHeaderClass, "w-28 px-4 py-2")}>{t("return.returnQty")}</th>
                            <th className="px-4 py-2 w-44">{t("return.returnType")}</th>
                            <th className="px-4 py-2">{t("return.reason")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.lines.map((row) => {
                            const key = `dispatch:${d.id}:line:${row.id}`;
                            const draft = drafts[key] ?? { returnQty: "", returnType: "unused" as const, reason: "" };

                            const dispatchedQty = row.quantity ?? 0;
                            const returnedQty = row.returned_quantity ?? 0;
                            const returnableQty = Math.max(0, dispatchedQty - returnedQty);

                            return (
                              <tr key={key} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {row.item_name?.trim() || `#${row.item}`}
                                  </p>
                                  {!row.is_extra && dispatchedQty > 0 ? (
                                    <span className="mt-0.5 block text-xs font-medium text-amber-600 dark:text-amber-400">
                                      {t("return.surplusQty", { qty: dispatchedQty })}
                                    </span>
                                  ) : null}
                                </td>
                                <td className={cn(quantityTableCellClass, "px-4 py-3 font-medium")}>
                                  <QuantityWithUnits value={dispatchedQty} unitsLabel={t("units")} />
                                </td>
                                <td className={cn(quantityTableCellClass, "px-4 py-3 text-slate-500")}>
                                  <QuantityWithUnits value={returnedQty} unitsLabel={t("units")} />
                                </td>
                                <td className={cn(quantityTableInputCellClass, "px-4 py-3")}>
                                  {returnableQty <= 0 ? (
                                    <span className="flex justify-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                      All returned
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      min={0}
                                      max={returnableQty}
                                      step="any"
                                      value={draft.returnQty}
                                      disabled={submitting}
                                      className={cn(compactInputClass, "mx-auto w-20 text-center")}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        const num = Number.parseFloat(v);
                                        if (num > returnableQty) {
                                          updateDraft(key, { returnQty: String(returnableQty) });
                                        } else {
                                          updateDraft(key, { returnQty: v });
                                        }
                                      }}
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <CheckmarkSelect
                                    listLabel={t("return.returnType")}
                                    buttonAriaLabel={t("return.returnType")}
                                    options={returnTypeOptions}
                                    value={draft.returnType}
                                    portaled
                                    searchable={false}
                                    size="sm"
                                    disabled={submitting || returnableQty <= 0}
                                    className="w-full"
                                    onChange={(v) =>
                                      updateDraft(key, {
                                        returnType: (v === "faulty" ? "faulty" : "unused") as DispatchReturnType,
                                      })
                                    }
                                  />
                                </td>
                                <td className="px-4 py-2 min-w-0 max-w-[18rem]">
                                  <textarea
                                    rows={1}
                                    wrap="off"
                                    value={draft.reason}
                                    disabled={submitting || returnableQty <= 0}
                                    placeholder={t("return.reasonPlaceholder")}
                                    className={cn(
                                      surfaceTextareaClassName,
                                      "h-9 min-h-0 w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden whitespace-nowrap resize-none py-1.5",
                                    )}
                                    onChange={(e) => updateDraft(key, { reason: e.target.value })}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SurfaceShell>
    </div>
  );
}

type RawDispatch = any; // replace with real API type
type MappedDispatch = {
  id: number;
  dispatch_order_number: string;
  dispatch_date: string;
  notes?: string | null;
  material_request?: number | null;
  organization?: number | null;
  worker: { id: number; first_name?: string; last_name?: string; username?: string; email?: string } | null;
  workerLabel: string;
  total_qty: number;
  lines: Array<{
    id: number;
    material_request_line?: number;
    item: number;
    item_name?: string | null;
    item_sku?: string | null;
    quantity?: number;
    returned_quantity?: number;
    is_extra?: boolean;
    remarks?: string | null;
  }>;
};

function workerLabelFrom(w: any): string {
  if (!w) return "—";
  const full = `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim();
  return full || w.name || w.username || w.email || `#${w.id}`;
}

function mapDispatches(raw: RawDispatch[]): MappedDispatch[] {
  return raw.map((d) => ({
    id: d.id,
    dispatch_order_number: d.dispatch_order_number,
    dispatch_date: d.dispatch_date,
    notes: d.notes ?? null,
    material_request: d.material_request ?? null,
    organization: d.organization ?? null,
    worker: d.worker ?? null,
    workerLabel: workerLabelFrom(d.worker ?? d.worker_name ?? d.worker_name),
    total_qty: Array.isArray(d.lines) ? d.lines.length : 0,
    lines: (d.lines ?? [])
      .filter((l: any) => l.is_extra)
      .map((l: any) => ({
        id: l.id,
        material_request_line: l.material_request_line ?? null,
        item: l.item,
        item_name: l.item_name ?? null,
        item_sku: l.item_sku ?? null,
        quantity: l.quantity ?? 0,
        returned_quantity: l.returned_quantity ?? 0,
        is_extra: !!l.is_extra,
        remarks: l.remarks ?? null,
      })),
  }));
}
