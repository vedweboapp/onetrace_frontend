"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchItemsPage } from "@/features/items/api/item.api";
import {
  dispatchMaterialRequest,
  fetchMaterialRequest,
} from "@/features/material-requests/api/material-request.api";
import type { MaterialRequestDispatchPayload } from "@/features/material-requests/types/material-request-dispatch.types";
import type { MaterialRequestDetail } from "@/features/material-requests/types/material-request.types";
import {
  materialRequestDispatchRows,
} from "@/features/material-requests/utils/material-request-nested-fields.util";
import type { MaterialRequestItemSource } from "@/features/material-requests/utils/material-request-item-aggregate.util";
import { allocateMaterialRequestDispatchQuantity } from "@/features/material-requests/utils/material-request-item-aggregate.util";
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import { DispatchedQuantityCell } from "@/shared/components/quantity/dispatched-quantity-cell";
import {
  quantityTableCellClass,
  quantityTableHeaderClass,
  quantityTableInputCellClass,
} from "@/shared/components/quantity/quantity-table-columns";
import { AppButton, CheckmarkSelect, SurfaceShell, surfaceInputClassName } from "@/shared/ui";

type LineDraft = {
  key: string;
  itemId: number;
  materialName: string;
  requested: number;
  alreadyDispatched: number;
  pending: number;
  dispatchQty: string;
  sources: MaterialRequestItemSource[];
};

type ExtraDraft = {
  id: string;
  item: string;
  quantity: string;
};

type Props = {
  materialRequestId: number;
};

const compactInputClass = cn(surfaceInputClassName, "h-9 min-h-9 rounded-md px-2.5 py-1.5 text-sm shadow-sm");

function dispatchSurplusPreview(requested: number, alreadyDispatched: number, dispatchQtyRaw: string): string | null {
  const dispatchQty = Number.parseFloat(dispatchQtyRaw.trim());
  if (!Number.isFinite(dispatchQty) || dispatchQty <= 0) return null;
  const totalAfter = alreadyDispatched + dispatchQty;
  if (totalAfter <= requested) return null;
  const surplus = totalAfter - requested;
  return `+${surplus.toFixed(0)}`;
}

export function MaterialRequestDispatchScreen({ materialRequestId }: Props) {
  const t = useTranslations("Dashboard.materialRequests");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const listHref = React.useMemo(() => {
    const needle = routes.dashboard.materialRequests;
    const i = pathname.indexOf(needle);
    return i >= 0 ? pathname.slice(0, i + needle.length) : needle;
  }, [pathname]);

  const detailHref = React.useMemo(() => {
    const dispatchSuffix = "/dispatch";
    const base =
      pathname.endsWith(dispatchSuffix) ? pathname.slice(0, -dispatchSuffix.length) : `${listHref}/${materialRequestId}`;
    return base;
  }, [pathname, listHref, materialRequestId]);

  const safeBack = resolveFormBackUrl(searchParams.get("back"), "material-requests", detailHref);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<MaterialRequestDetail | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [itemOptions, setItemOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [itemLabelById, setItemLabelById] = React.useState<Record<number, string>>({});
  const [lines, setLines] = React.useState<LineDraft[]>([]);
  const [extraDraft, setExtraDraft] = React.useState<ExtraDraft>({ id: "new", item: "", quantity: "" });
  const [extraRows, setExtraRows] = React.useState<ExtraDraft[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [row, itemsRes] = await Promise.all([
          fetchMaterialRequest(materialRequestId),
          fetchItemsPage(1, 500, { isActive: true }),
        ]);
        if (cancelled) return;
        setDetail(row);
        const options = itemsRes.items.map((item) => ({
          value: String(item.id),
          label: item.name?.trim() || item.sku?.trim() || `#${item.id}`,
        }));
        const labels: Record<number, string> = {};
        for (const item of itemsRes.items) {
          labels[item.id] = item.name?.trim() || item.sku?.trim() || `#${item.id}`;
        }
        setItemOptions(options);
        setItemLabelById(labels);
        setLines(
          materialRequestDispatchRows(row.items).map((itemRow) => ({
            key: itemRow.key,
            itemId: itemRow.itemId,
            materialName: itemRow.materialName,
            requested: itemRow.requested,
            alreadyDispatched: itemRow.dispatched,
            pending: itemRow.pending,
            dispatchQty: itemRow.pending > 0 ? String(itemRow.pending) : "",
            sources: itemRow.sources,
          })),
        );
      } catch {
        if (!cancelled) setLoadError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [materialRequestId, t]);

  function updateLineQty(lineKey: string, value: string) {
    setLines((prev) =>
      prev.map((row) => (row.key === lineKey ? { ...row, dispatchQty: value } : row)),
    );
  }

  function addExtraRow() {
    const itemId = extraDraft.item.trim();
    const qty = Number.parseFloat(extraDraft.quantity.trim());
    if (!itemId || !Number.isFinite(qty) || qty <= 0) return;
    setExtraRows((prev) => [
      ...prev,
      { id: `extra-${Date.now()}`, item: itemId, quantity: String(qty) },
    ]);
    setExtraDraft({ id: "new", item: "", quantity: "" });
  }

  function removeExtraRow(id: string) {
    setExtraRows((prev) => prev.filter((row) => row.id !== id));
  }

  async function handleSubmit() {
    if (!detail) return;
    const payload: MaterialRequestDispatchPayload = {
      lines: lines.flatMap((row) => {
        const qty = Number.parseFloat(row.dispatchQty.trim());
        if (!Number.isFinite(qty) || qty <= 0) return [];
        return allocateMaterialRequestDispatchQuantity(row.sources, qty);
      }),
      extra_items: extraRows
        .map((row) => ({
          item: Number.parseInt(row.item, 10),
          quantity: Number.parseFloat(row.quantity.trim()),
        }))
        .filter((row) => Number.isFinite(row.item) && row.item > 0 && Number.isFinite(row.quantity) && row.quantity > 0),
    };

    if (payload.lines.length === 0 && payload.extra_items.length === 0) return;

    setSaving(true);
    try {
      await dispatchMaterialRequest(detail.id, detail, payload, itemLabelById);
      toastSuccess(t("dispatch.successToast"));
      router.replace(`${detailHref}?back=${encodeURIComponent(listHref)}`);
    } finally {
      setSaving(false);
    }
  }

  const usedItemIds = React.useMemo(() => {
    const ids = new Set<number>(lines.map((row) => row.itemId));
    for (const row of extraRows) {
      const id = Number.parseInt(row.item, 10);
      if (Number.isFinite(id) && id > 0) ids.add(id);
    }
    return ids;
  }, [lines, extraRows]);

  const extraItemOptions = React.useMemo(
    () => itemOptions.filter((opt) => !usedItemIds.has(Number.parseInt(opt.value, 10))),
    [itemOptions, usedItemIds],
  );

  const canSubmit =
    lines.some((row) => {
      const qty = Number.parseFloat(row.dispatchQty.trim());
      return Number.isFinite(qty) && qty > 0;
    }) || extraRows.length > 0;

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={t("dispatch.pageTitle")}
        subtitle={
          detail
            ? t("dispatch.pageSubtitle", { requestNumber: detail.request_number })
            : t("dispatch.pageSubtitleGeneric")
        }
        backHref={safeBack}
        backAriaLabel={t("dispatch.backAria")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => router.push(safeBack)}
            >
              {t("modal.cancel")}
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={!canSubmit || saving || loading || !detail}
              onClick={() => void handleSubmit()}
            >
              {t("dispatch.confirm")}
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
        ) : (
          <div className="space-y-8 p-4 sm:p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">{t("dispatch.pageHint")}</p>

            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("dispatch.sectionLines")}</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                      <th className="px-3 py-2">{t("lineItems.itemDetails")}</th>
                      <th className={quantityTableHeaderClass}>{t("dispatch.requested")}</th>
                      <th className={quantityTableHeaderClass}>{t("dispatch.dispatched")}</th>
                      <th className={quantityTableHeaderClass}>{t("dispatch.pending")}</th>
                      <th className={cn(quantityTableHeaderClass, "w-36")}>{t("dispatch.dispatchNow")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                          {t("lineItems.empty")}
                        </td>
                      </tr>
                    ) : (
                      lines.map((row) => {
                        const surplusPreview = dispatchSurplusPreview(
                          row.requested,
                          row.alreadyDispatched,
                          row.dispatchQty,
                        );
                        return (
                          <tr key={row.key} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                              {row.materialName}
                            </td>
                            <td className={cn(quantityTableCellClass, "font-medium")}>
                              {row.requested.toFixed(0)} {t("lineItems.units")}
                            </td>
                            <td className={quantityTableCellClass}>
                              <DispatchedQuantityCell
                                fulfilled={Math.min(row.alreadyDispatched, row.requested)}
                                surplus={Math.max(0, row.alreadyDispatched - row.requested)}
                                unitsLabel={t("lineItems.units")}
                              />
                            </td>
                            <td className={quantityTableCellClass}>
                              {row.pending.toFixed(0)} {t("lineItems.units")}
                            </td>
                            <td className={quantityTableInputCellClass}>
                              <div className="flex w-full flex-col items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={row.dispatchQty}
                                  disabled={saving}
                                  className={cn(compactInputClass, "w-20 text-center")}
                                  onChange={(e) => updateLineQty(row.key, e.target.value)}
                                />
                                {surplusPreview ? (
                                  <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                    {surplusPreview} {t("lineItems.units")}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("dispatch.sectionExtra")}</h2>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <CheckmarkSelect
                    listLabel={t("dispatch.extraItem")}
                    buttonAriaLabel={t("dispatch.extraItem")}
                    options={extraItemOptions}
                    value={extraDraft.item}
                    emptyLabel={t("placeholders.item")}
                    portaled
                    searchable
                    size="sm"
                    disabled={saving || extraItemOptions.length === 0}
                    onChange={(v) => setExtraDraft((prev) => ({ ...prev, item: v }))}
                  />
                </div>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={extraDraft.quantity}
                  disabled={saving}
                  placeholder={t("dispatch.extraQty")}
                  className={cn(compactInputClass, "w-24")}
                  onChange={(e) => setExtraDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                />
                <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={addExtraRow}>
                  <Plus className="size-4" aria-hidden />
                  {t("dispatch.addExtra")}
                </AppButton>
              </div>
              {extraRows.length > 0 ? (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                  {extraRows.map((row) => {
                    const id = Number.parseInt(row.item, 10);
                    const label = Number.isFinite(id) ? itemLabelById[id] ?? `#${id}` : row.item;
                    return (
                      <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {label} · {row.quantity} {t("lineItems.units")}
                        </span>
                        <AppButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          aria-label={t("dispatch.removeExtra")}
                          onClick={() => removeExtraRow(row.id)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </AppButton>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          </div>
        )}
      </SurfaceShell>
    </div>
  );
}
