"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { DetailEntityLink } from "@/shared/components/entity";
import {
  createDispatchReturnRequest,
  fetchDispatchesPage,
  fetchWorkerReturnMaterials,
} from "@/features/dispatches/api/dispatch.api";
import type { DispatchReturnType, WorkerReturnDatePreset } from "@/features/dispatches/types/dispatch.types";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { cn } from "@/core/utils/http.util";
import { toastSuccess, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import {
  AppButton,
  CheckmarkSelect,
  SurfaceDateInput,
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

function lineDraftKey(groupKey: string): string {
  return groupKey;
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
  const [datePreset, setDatePreset] = React.useState<WorkerReturnDatePreset>("till_today");
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

  const datePresetOptions = React.useMemo(
    () => [
      { value: "till_today", label: t("return.dateTillToday") },
      { value: "till_yesterday", label: t("return.dateTillYesterday") },
      { value: "this_week", label: t("return.dateTillThisWeek") },
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
      } catch (error) {
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
        date_from: datePreset === "custom" ? dateFrom || undefined : undefined,
        date_to: datePreset === "custom" ? dateTo || undefined : undefined,
        material_request_id:
          datePreset === "material_request" ? Number.parseInt(materialRequestId, 10) : undefined,
      });
      setMaterials(data);
      const initial: Record<string, LineDraft> = {};
      for (const line of data.lines) {
        const key = lineDraftKey(line.group_key);
        initial[key] = {
          returnQty: "",
          returnType: "unused",
          reason: "",
        };
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

  async function handleSubmitRequest() {
    const worker = Number.parseInt(workerId, 10);
    if (!materials || !Number.isFinite(worker)) return;

    const groups = materials.lines.flatMap((row) => {
      const draft = drafts[lineDraftKey(row.group_key)];
      const quantity = Number.parseFloat(draft?.returnQty?.trim() ?? "");
      if (!Number.isFinite(quantity) || quantity <= 0) return [];
      return [{
        group_key: row.group_key,
        quantity,
        return_type: draft?.returnType ?? "unused",
        reason: draft?.reason?.trim() || undefined,
      }];
    });

    if (groups.length === 0) return;

    setSubmitting(true);
    try {
      await createDispatchReturnRequest({ worker_name: worker, groups });
      toastSuccess(t("return.requestSubmittedToast"));
      router.replace(listBack);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmitRequest = materials?.lines.some((row) => {
    const qty = Number.parseFloat(drafts[lineDraftKey(row.group_key)]?.returnQty?.trim() ?? "");
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
              <div className="min-w-[10rem] flex-1 sm:max-w-xs">
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
                  onChange={(v) => setDatePreset((v as WorkerReturnDatePreset) || "till_today")}
                />
              </div>
              {datePreset === "custom" ? (
                <>
                  <div className="min-w-[10rem] flex-1 sm:max-w-xs">
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
                  <div className="min-w-[10rem] flex-1 sm:max-w-xs">
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
                <div className="min-w-[10rem] flex-1 sm:max-w-xs">
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
            <p className="text-sm text-slate-500">{t("return.selectFiltersHint")}</p>
          ) : materials.lines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
              {t("return.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                    <th className="px-3 py-2">{t("table.materialItem")}</th>
                    <th className="px-3 py-2">{t("return.source")}</th>
                    <th className={quantityTableHeaderClass}>{t("table.extra")}</th>
                    <th className={quantityTableHeaderClass}>{t("return.alreadyReturned")}</th>
                    <th className={quantityTableHeaderClass}>{t("return.returnQty")}</th>
                    <th className="px-3 py-2">{t("return.returnType")}</th>
                    <th className="px-3 py-2">{t("return.reason")}</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.lines.map((row) => {
                    const key = lineDraftKey(row.group_key);
                    const draft = drafts[key] ?? { returnQty: "", returnType: "unused" as const, reason: "" };
                    return (
                      <tr key={key} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {row.item_name?.trim() || `#${row.item_id}`}
                          </p>
                          {!row.is_extra && row.dispatched_quantity > 0 ? (
                            <span className="mt-0.5 block text-xs font-medium text-amber-600 dark:text-amber-400">
                              {t("return.surplusQty", { qty: row.dispatched_quantity })}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          {row.is_extra ? (
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                              {t("return.sourceExtra")}
                            </span>
                          ) : row.material_request_id != null && row.material_request_id > 0 ? (
                            <DetailEntityLink
                              href={`${routes.dashboard.materialRequests}/${row.material_request_id}`}
                              className="font-medium text-slate-800 underline-offset-2 hover:underline dark:text-slate-200"
                            >
                              {row.material_request_number?.trim() || `#${row.material_request_id}`}
                            </DetailEntityLink>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={cn(quantityTableCellClass, "font-medium")}>
                          <QuantityWithUnits value={row.dispatched_quantity} unitsLabel={t("units")} />
                        </td>
                        <td className={cn(quantityTableCellClass, "text-slate-500")}>
                          <QuantityWithUnits value={row.returned_quantity} unitsLabel={t("units")} />
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
                        <td className="min-w-[12rem] px-3 py-3">
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
          )}
        </div>
      </SurfaceShell>
    </div>
  );
}
