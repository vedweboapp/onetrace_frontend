"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  completeDispatchReturnRequest,
  createDispatchReturnRequest,
  fetchDispatchReturnRequests,
  fetchDispatchesPage,
  fetchWorkerReturnMaterials,
} from "@/features/dispatches/api/dispatch.api";
import type {
  DispatchReturnRequest,
  DispatchReturnType,
  WorkerReturnDatePreset,
  WorkerReturnMaterialLine,
} from "@/features/dispatches/types/dispatch.types";
import {
  allocateReturnQuantityAcrossSources,
  dispatchReturnWorkerLabel,
} from "@/features/dispatches/utils/dispatch-return.util";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import {
  AppButton,
  AppTabs,
  CheckmarkSelect,
  SurfaceDateInput,
  SurfaceShell,
  surfaceInputClassName,
  surfaceTextareaClassName,
} from "@/shared/ui";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import {
  quantityTableCellClass,
  quantityTableHeaderClass,
  quantityTableInputCellClass,
  QuantityWithUnits,
} from "@/shared/components/quantity/quantity-table-columns";

function lineDraftKey(line: WorkerReturnMaterialLine): string {
  return line.group_key;
}

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

export function WorkerReturnToStockScreen({
  initialWorkerId = null,
  initialMaterialRequestId = null,
}: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const searchParams = useSearchParams();
  const listBack = resolveFormBackUrl(searchParams.get("back"), "return-to-stock", routes.dashboard.returnToStock);

  const [activeTab, setActiveTab] = React.useState("request");
  const [workerId, setWorkerId] = React.useState(
    initialWorkerId != null && initialWorkerId > 0 ? String(initialWorkerId) : "",
  );
  const [datePreset, setDatePreset] = React.useState<WorkerReturnDatePreset>("today");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [materialRequestId, setMaterialRequestId] = React.useState(
    initialMaterialRequestId != null && initialMaterialRequestId > 0
      ? String(initialMaterialRequestId)
      : "",
  );
  const [workerOptions, setWorkerOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [mrOptions, setMrOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [materials, setMaterials] = React.useState<Awaited<ReturnType<typeof fetchWorkerReturnMaterials>> | null>(
    null,
  );
  const [drafts, setDrafts] = React.useState<Record<string, LineDraft>>({});

  const [pendingRequests, setPendingRequests] = React.useState<DispatchReturnRequest[]>([]);
  const [pendingLoading, setPendingLoading] = React.useState(false);
  const [completingId, setCompletingId] = React.useState<number | null>(null);

  const dateFmt = React.useMemo(
    () => new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }),
    [],
  );

  const datePresetOptions = React.useMemo(
    () => [
      { value: "today", label: t("return.dateToday") },
      { value: "yesterday", label: t("return.dateYesterday") },
      { value: "custom", label: t("return.dateCustom") },
      { value: "material_request", label: t("return.dateByMaterialRequest") },
    ],
    [t],
  );

  const returnTypeOptions = React.useMemo(
    () => [
      { value: "unused", label: t("return.typeUnused") },
      { value: "faulty", label: t("return.typeFaulty") },
    ],
    [t],
  );

  const tabs = React.useMemo(
    () => [
      { id: "request", label: t("return.tabRequest") },
      { id: "approve", label: t("return.tabApprove") },
    ],
    [t],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const workers = await loadTechnicianOptions();
        if (!cancelled) setWorkerOptions(workers);
      } catch {
        if (!cancelled) setWorkerOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const id = Number.parseInt(workerId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setMrOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchDispatchesPage(1, 500, { worker_name: id });
        if (cancelled) return;
        const seen = new Set<number>();
        const options: { value: string; label: string }[] = [];
        for (const row of items) {
          if (row.material_request_id <= 0 || seen.has(row.material_request_id)) continue;
          seen.add(row.material_request_id);
          options.push({
            value: String(row.material_request_id),
            label: row.material_request_number?.trim() || `MR #${row.material_request_id}`,
          });
        }
        setMrOptions(options);
      } catch {
        if (!cancelled) setMrOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workerId]);

  async function loadMaterials() {
    const worker = Number.parseInt(workerId, 10);
    if (!Number.isFinite(worker) || worker <= 0) {
      setLoadError(t("return.workerRequired"));
      return;
    }
    if (datePreset === "material_request") {
      const mr = Number.parseInt(materialRequestId, 10);
      if (!Number.isFinite(mr) || mr <= 0) {
        setLoadError(t("return.materialRequestRequired"));
        return;
      }
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchWorkerReturnMaterials({
        worker_name: worker,
        date_preset: datePreset,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        material_request_id:
          datePreset === "material_request" ? Number.parseInt(materialRequestId, 10) : undefined,
      });
      setMaterials(data);
      const initial: Record<string, LineDraft> = {};
      for (const line of data.lines) {
        const key = lineDraftKey(line);
        initial[key] = {
          returnQty: "",
          returnType: "unused",
          reason: "",
        };
      }
      setDrafts(initial);
    } catch {
      setLoadError(t("return.loadError"));
      setMaterials(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingRequests() {
    setPendingLoading(true);
    try {
      const rows = await fetchDispatchReturnRequests({ status: "pending" });
      setPendingRequests(rows);
    } catch {
      setPendingRequests([]);
    } finally {
      setPendingLoading(false);
    }
  }

  React.useEffect(() => {
    if (activeTab === "approve") void loadPendingRequests();
  }, [activeTab]);

  React.useEffect(() => {
    if (!workerId || loading) return;
    if (initialWorkerId != null) void loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial worker from URL
  }, [workerId]);

  function updateDraft(key: string, patch: Partial<LineDraft>) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function handleSubmitRequest() {
    const worker = Number.parseInt(workerId, 10);
    if (!materials || !Number.isFinite(worker)) return;

    const lines = materials.lines.flatMap((row) => {
      const draft = drafts[lineDraftKey(row)];
      const quantity = Number.parseFloat(draft?.returnQty?.trim() ?? "");
      if (!Number.isFinite(quantity) || quantity <= 0) return [];
      return allocateReturnQuantityAcrossSources(
        row,
        quantity,
        draft?.returnType ?? "unused",
        draft?.reason?.trim() || undefined,
      );
    });

    if (lines.length === 0) return;

    setSubmitting(true);
    try {
      await createDispatchReturnRequest({ worker_name: worker, lines });
      toastSuccess(t("return.requestSubmittedToast"));
      setDrafts({});
      await loadMaterials();
      setActiveTab("approve");
      await loadPendingRequests();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteRequest(requestId: number) {
    setCompletingId(requestId);
    try {
      await completeDispatchReturnRequest(requestId);
      toastSuccess(t("return.completeSuccessToast"));
      await loadPendingRequests();
      if (materials) await loadMaterials();
    } finally {
      setCompletingId(null);
    }
  }

  const canSubmitRequest = materials?.lines.some((row) => {
    const qty = Number.parseFloat(drafts[lineDraftKey(row)]?.returnQty?.trim() ?? "");
    return Number.isFinite(qty) && qty > 0;
  });

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={t("return.hubTitle")}
        subtitle={t("return.hubSubtitle")}
        backHref={listBack}
        backAriaLabel={t("return.backAria")}
      />

      <div className="px-4 sm:px-6">
        <AppTabs
          tabs={tabs}
          value={activeTab}
          onValueChange={setActiveTab}
          ariaLabel={t("return.tabsAria")}
          panelIdPrefix="worker-return-tab"
          className="mb-4"
        />
      </div>

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        <div
          role="tabpanel"
          id={`worker-return-tab-${activeTab}`}
          className="p-4 sm:p-6"
        >
          {activeTab === "request" ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{t("return.operatorHint")}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
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
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("return.dateFilter")}
                    </label>
                    <CheckmarkSelect
                      listLabel={t("return.dateFilter")}
                      buttonAriaLabel={t("return.dateFilter")}
                      options={datePresetOptions}
                      value={datePreset}
                      portaled
                      searchable={false}
                      className="w-full"
                      onChange={(v) => setDatePreset((v as WorkerReturnDatePreset) || "today")}
                    />
                  </div>
                  {datePreset === "custom" ? (
                    <>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t("return.dateFrom")}
                        </label>
                        <SurfaceDateInput
                          type="date"
                          value={dateFrom}
                          className="w-full"
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t("return.dateTo")}
                        </label>
                        <SurfaceDateInput
                          type="date"
                          value={dateTo}
                          className="w-full"
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </>
                  ) : null}
                  {datePreset === "material_request" ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("fields.materialRequest")}
                      </label>
                      <CheckmarkSelect
                        listLabel={t("fields.materialRequest")}
                        buttonAriaLabel={t("fields.materialRequest")}
                        options={mrOptions}
                        value={materialRequestId}
                        emptyLabel={t("return.selectMaterialRequest")}
                        portaled
                        searchable
                        className="w-full"
                        onChange={setMaterialRequestId}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex justify-end">
                  <AppButton type="button" variant="secondary" size="sm" loading={loading} onClick={() => void loadMaterials()}>
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
                <p className="text-sm text-slate-500">{t("return.selectFiltersHint")}</p>
              ) : materials.lines.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
                  {t("return.empty")}
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full min-w-[960px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                          <th className="px-3 py-2">{t("table.materialItem")}</th>
                          <th className="px-3 py-2">{t("return.source")}</th>
                          <th className={quantityTableHeaderClass}>{t("table.dispatched")}</th>
                          <th className={quantityTableHeaderClass}>{t("return.alreadyReturned")}</th>
                          <th className={quantityTableHeaderClass}>{t("return.returnable")}</th>
                          <th className={quantityTableHeaderClass}>{t("return.returnQty")}</th>
                          <th className="px-3 py-2">{t("return.returnType")}</th>
                          <th className="px-3 py-2">{t("return.reason")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.lines.map((row) => {
                          const key = lineDraftKey(row);
                          const draft = drafts[key] ?? { returnQty: "", returnType: "unused" as const, reason: "" };
                          return (
                            <tr key={key} className="border-b border-slate-100 dark:border-slate-800">
                              <td className="px-3 py-3">
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {row.item_name?.trim() || `#${row.item_id}`}
                                </p>
                              </td>
                              <td className="px-3 py-3">
                                {row.is_extra ? (
                                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                    {t("return.sourceExtra")}
                                  </span>
                                ) : row.material_request_id != null && row.material_request_id > 0 ? (
                                  <Link
                                    href={`${routes.dashboard.materialRequests}/${row.material_request_id}`}
                                    className="font-medium text-slate-800 underline-offset-2 hover:underline dark:text-slate-200"
                                  >
                                    {row.material_request_number?.trim() || `#${row.material_request_id}`}
                                  </Link>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className={cn(quantityTableCellClass, "font-medium")}>
                                <QuantityWithUnits
                                  value={row.dispatched_quantity}
                                  unitsLabel={t("units")}
                                />
                              </td>
                              <td className={cn(quantityTableCellClass, "text-slate-500")}>
                                <QuantityWithUnits
                                  value={row.returned_quantity}
                                  unitsLabel={t("units")}
                                />
                              </td>
                              <td className={cn(quantityTableCellClass, "font-medium")}>
                                <QuantityWithUnits
                                  value={row.returnable_quantity}
                                  unitsLabel={t("units")}
                                />
                              </td>
                              <td className={quantityTableInputCellClass}>
                                <input
                                  type="number"
                                  min={0}
                                  max={row.returnable_quantity}
                                  step="any"
                                  value={draft.returnQty}
                                  disabled={submitting}
                                  className={cn(compactInputClass, "mx-auto w-20 text-center")}
                                  onChange={(e) => updateDraft(key, { returnQty: e.target.value })}
                                />
                              </td>
                              <td className="px-3 py-3">
                                <CheckmarkSelect
                                  listLabel={t("return.returnType")}
                                  buttonAriaLabel={t("return.returnType")}
                                  options={returnTypeOptions}
                                  value={draft.returnType}
                                  portaled
                                  searchable={false}
                                  size="sm"
                                  disabled={submitting}
                                  className="min-w-[9rem]"
                                  onChange={(v) =>
                                    updateDraft(key, {
                                      returnType: (v === "faulty" ? "faulty" : "unused") as DispatchReturnType,
                                    })
                                  }
                                />
                              </td>
                              <td className="px-3 py-3 min-w-[12rem]">
                                <textarea
                                  rows={1}
                                  value={draft.reason}
                                  disabled={submitting}
                                  placeholder={t("return.reasonPlaceholder")}
                                  className={cn(surfaceTextareaClassName, "min-h-9 resize-none py-1.5 text-sm")}
                                  onChange={(e) => updateDraft(key, { reason: e.target.value })}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
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
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("return.approverHint")}</p>
              {pendingLoading ? (
                <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              ) : pendingRequests.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
                  {t("return.noPendingRequests")}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                  {pendingRequests.map((req) => (
                    <li key={req.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{req.request_number}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {dispatchReturnWorkerLabel(req.worker_name)} ·{" "}
                            {formatFlexibleApiDate(req.requested_at, dateFmt)}
                          </p>
                        </div>
                        <AppButton
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={completingId === req.id}
                          disabled={completingId != null}
                          onClick={() => void handleCompleteRequest(req.id)}
                        >
                          {t("return.completeToStock")}
                        </AppButton>
                      </div>
                      <ul className="mt-3 space-y-2 text-sm">
                        {req.lines.map((line, index) => (
                          <li
                            key={`${line.dispatch_id}-${line.line_id}-${index}`}
                            className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/50"
                          >
                            <span className="font-medium">
                              {line.item_name?.trim() || `#${line.item_id}`}
                            </span>
                            <span className="text-slate-500">
                              {" "}
                              · {line.quantity} {t("units")} · {line.dispatch_number}
                              {line.job_name ? ` · ${line.job_name}` : ""}
                            </span>
                            {line.reason ? (
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                {t("return.reason")}: {line.reason}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </SurfaceShell>
    </div>
  );
}
