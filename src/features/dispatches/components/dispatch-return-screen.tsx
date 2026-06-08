"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  fetchDispatchReturnItems,
  returnDispatchToStock,
} from "@/features/dispatches/api/dispatch.api";
import type { DispatchReturnItem, DispatchReturnType } from "@/features/dispatches/types/dispatch.types";
import { dispatchReturnWorkerLabel } from "@/features/dispatches/utils/dispatch-return.util";
import { allocateReturnQuantityAcrossDispatchLines } from "@/features/dispatches/utils/dispatch-line-aggregate.util";
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import {
  quantityTableCellClass,
  quantityTableHeaderClass,
  quantityTableInputCellClass,
  QuantityWithUnits,
} from "@/shared/components/quantity/quantity-table-columns";
import { AppButton, CheckmarkSelect, SurfaceShell, surfaceInputClassName } from "@/shared/ui";

type LineDraft = {
  returnQty: string;
  returnType: DispatchReturnType;
};

type Props = {
  dispatchId: number;
};

const compactInputClass = cn(surfaceInputClassName, "h-9 min-h-9 rounded-md px-2.5 py-1.5 text-sm shadow-sm");

export function DispatchReturnScreen({ dispatchId }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dispatchHref = React.useMemo(() => {
    const returnSuffix = "/return";
    if (pathname.endsWith(returnSuffix)) {
      return pathname.slice(0, -returnSuffix.length);
    }
    return `${routes.dashboard.dispatches}/${dispatchId}`;
  }, [pathname, dispatchId]);

  const safeBack = resolveFormBackUrl(searchParams.get("back"), "dispatches", dispatchHref);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [returnData, setReturnData] = React.useState<Awaited<ReturnType<typeof fetchDispatchReturnItems>> | null>(
    null,
  );
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
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchDispatchReturnItems(dispatchId);
        if (cancelled) return;
        setReturnData(data);
        const initial: Record<string, LineDraft> = {};
        for (const line of data.lines) {
          const key = line.group_key ?? `line-${line.line_id}`;
          initial[key] = {
            returnQty: String(line.returnable_quantity),
            returnType: "unused",
          };
        }
        setDrafts(initial);
      } catch {
        if (!cancelled) setLoadError(t("return.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatchId, t]);

  function updateDraft(groupKey: string, patch: Partial<LineDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], ...patch },
    }));
  }

  function itemLabel(row: DispatchReturnItem): string {
    return row.item_name?.trim() || `#${row.item_id}`;
  }

  async function handleSubmit() {
    if (!returnData) return;

    const lines = returnData.lines.flatMap((row) => {
      const key = row.group_key ?? `line-${row.line_id}`;
      const draft = drafts[key];
      const quantity = Number.parseFloat(draft?.returnQty?.trim() ?? "");
      if (!Number.isFinite(quantity) || quantity <= 0) return [];
      const sources = row.sources ?? [{ line_id: row.line_id, returnable_quantity: row.returnable_quantity }];
      return allocateReturnQuantityAcrossDispatchLines(sources, quantity).map((allocated) => ({
        line_id: allocated.line_id,
        quantity: allocated.quantity,
        return_type: draft?.returnType ?? "unused",
      }));
    });

    if (lines.length === 0) return;

    setSaving(true);
    try {
      await returnDispatchToStock(dispatchId, { lines });
      toastSuccess(t("return.successToast"));
      router.replace(`${dispatchHref}?back=${encodeURIComponent(safeBack)}`);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = returnData?.lines.some((row) => {
    const key = row.group_key ?? `line-${row.line_id}`;
    const qty = Number.parseFloat(drafts[key]?.returnQty?.trim() ?? "");
    return Number.isFinite(qty) && qty > 0;
  });

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={t("return.pageTitle")}
        subtitle={
          returnData
            ? t("return.pageSubtitle", {
                dispatch: returnData.dispatch_number,
                request: returnData.material_request_number?.trim() || `#${returnData.material_request_id}`,
              })
            : t("return.pageSubtitleGeneric")
        }
        backHref={safeBack}
        backAriaLabel={t("return.backAria")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => router.push(safeBack)}
            >
              {t("restock.close")}
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={!canSubmit || saving || loading || !returnData}
              onClick={() => void handleSubmit()}
            >
              {t("return.submit")}
            </AppButton>
          </div>
        }
      />

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : loadError ? (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : !returnData ? (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">{t("return.loadError")}</p>
        ) : (
          <div className="space-y-6 p-4 sm:p-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-slate-600 dark:text-slate-400">{t("return.hint")}</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("table.workerName")}</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {dispatchReturnWorkerLabel(returnData.worker_name)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fields.materialRequest")}
                  </dt>
                  <dd className="mt-1">
                    {returnData.material_request_id > 0 ? (
                      <Link
                        href={`${routes.dashboard.materialRequests}/${returnData.material_request_id}`}
                        className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
                      >
                        {returnData.material_request_number?.trim() || `#${returnData.material_request_id}`}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("table.dispatchId")}</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{returnData.dispatch_number}</dd>
                </div>
              </dl>
            </div>

            {returnData.lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
                {t("return.empty")}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                      <th className="px-3 py-2">{t("table.materialItem")}</th>
                      <th className={quantityTableHeaderClass}>{t("table.extra")}</th>
                      <th className={quantityTableHeaderClass}>{t("return.alreadyReturned")}</th>
                      <th className={quantityTableHeaderClass}>{t("return.returnQty")}</th>
                      <th className="px-3 py-2">{t("return.returnType")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnData.lines.map((row) => {
                      const groupKey = row.group_key ?? `line-${row.line_id}`;
                      const draft = drafts[groupKey] ?? { returnQty: "", returnType: "unused" as const };
                      return (
                        <tr key={groupKey} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{itemLabel(row)}</p>
                            {row.is_extra ? (
                              <span className="mt-1 block text-xs font-medium text-amber-600 dark:text-amber-400">
                                {t("detail.extraItem")}
                              </span>
                            ) : row.dispatched_quantity > 0 ? (
                              <span className="mt-1 block text-xs font-medium text-amber-600 dark:text-amber-400">
                                {t("return.surplusQty", { qty: row.dispatched_quantity })}
                              </span>
                            ) : null}
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
                              disabled={saving}
                              className={cn(compactInputClass, "mx-auto w-20 text-center")}
                              onChange={(e) => updateDraft(groupKey, { returnQty: e.target.value })}
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
                              disabled={saving}
                              className="min-w-[9rem]"
                              onChange={(v) =>
                                updateDraft(groupKey, {
                                  returnType: (v === "faulty" ? "faulty" : "unused") as DispatchReturnType,
                                })
                              }
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
        )}
      </SurfaceShell>
    </div>
  );
}
