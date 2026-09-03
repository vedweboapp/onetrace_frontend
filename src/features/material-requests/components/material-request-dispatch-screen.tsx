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
import { cn } from "@/core/utils/http.util";
import { toastSuccess, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
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
import { playFlyToNavCelebration } from "@/shared/ui/fly-to-nav-celebration";
import { FIELD_MAX_LENGTH, sanitizeDescriptionInput } from "@/shared/form";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";

type LineDraft = {
  key: string;
  itemId: number;
  /** IDs of the underlying material_request_line rows for this item. */
  materialRequestLineIds: number[];
  /** Per-line requested quantities aligned with materialRequestLineIds. */
  lineRequestedQtys: number[];
  materialName: string;
  requested: number;
  alreadyDispatched: number;
  fulfilled: number;
  surplus: number;
  pending: number;
  dispatchQty: string;
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

export function MaterialRequestDispatchScreen({ materialRequestId }: Props) {
  const t = useTranslations("Dashboard.materialRequests");
  const dispatchT = useTranslations("Dashboard.materialRequests.dispatch");
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
  const [notes, setNotes] = React.useState<string>("");
  const confirmOriginRef = React.useRef<HTMLElement | null>(null);

  const itemQuickCreate = useQuickCreate({ kind: "item" });
  const reloadItemOptions = React.useCallback(async () => {
    try {
      const itemsRes = await fetchItemsPage(1, 500, { isActive: true });
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
    } catch {
      /* keep existing options */
    }
  }, []);
  useQuickCreateReturn({
    onReloadOptions: reloadItemOptions,
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget !== "item") return;
      setExtraDraft((prev) => ({ ...prev, item: selectId }));
    },
  });

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
        const summaries = row.item_summaries ?? [];
        // Build a map from item_id → underlying material_request_line entries
        const linesByItemId = new Map<number, Array<{ id: number; requested: number }>>();
        for (const line of row.items ?? []) {
          const itemId =
            line.item != null && typeof line.item === "object" && "id" in line.item
              ? (line.item as { id: number }).id
              : typeof line.item === "number"
                ? line.item
                : null;
          if (itemId == null || line.id == null) continue;
          const requested =
            typeof line.requested_quantity === "number" ? line.requested_quantity
            : typeof line.quantity === "number" ? line.quantity
            : 0;
          const bucket = linesByItemId.get(itemId) ?? [];
          bucket.push({ id: line.id, requested });
          linesByItemId.set(itemId, bucket);
        }
        setLines(
          summaries.map((itemRow) => {
            const underlying = linesByItemId.get(itemRow.item_id) ?? [];
            return {
              key: itemRow.group_key,
              itemId: itemRow.item_id,
              materialRequestLineIds: underlying.map((l) => l.id),
              lineRequestedQtys: underlying.map((l) => l.requested),
              materialName: itemRow.item_name,
              requested: itemRow.requested_quantity,
              alreadyDispatched: itemRow.dispatched_quantity,
              fulfilled: itemRow.fulfilled_quantity,
              surplus: itemRow.surplus_quantity,
              pending: itemRow.pending_quantity,
              dispatchQty:
                itemRow.default_dispatch_quantity != null && itemRow.default_dispatch_quantity > 0
                  ? String(itemRow.default_dispatch_quantity)
                  : itemRow.pending_quantity > 0
                    ? String(itemRow.pending_quantity)
                    : "",
            };
          }),
        );
      } catch (error) {
        if (!cancelled) setLoadError(getApiErrorDisplayMessage(error, t("detailLoadError")));
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
    const dispatchDate = new Date().toISOString().slice(0, 10);

    // Build lines: one entry per underlying material_request_line.
    // If an item maps to multiple lines, split qty proportionally by requested_quantity.
    const lineEntries = lines.flatMap((row) => {
      const qty = Number.parseFloat(row.dispatchQty.trim());
      if (!Number.isFinite(qty) || qty <= 0) return [];

      const lineIds = row.materialRequestLineIds;
      const lineReqs = row.lineRequestedQtys;

      // When we have individual line IDs, emit one entry per line
      if (lineIds.length > 0) {
        const totalReq = lineReqs.reduce((s, q) => s + q, 0);
        return lineIds.map((lineId, idx) => {
          // Proportional split; last line gets any rounding remainder
          const proportion = totalReq > 0 ? lineReqs[idx] / totalReq : 1 / lineIds.length;
          const lineQty =
            idx === lineIds.length - 1
              ? Math.round((qty - lineIds.slice(0, -1).reduce((s, _, i) => {
                  const p = totalReq > 0 ? lineReqs[i] / totalReq : 1 / lineIds.length;
                  return s + Math.round(p * qty * 1000) / 1000;
                }, 0)) * 1000) / 1000
              : Math.round(proportion * qty * 1000) / 1000;
          return {
            material_request_line: lineId,
            item: row.itemId,
            quantity: lineQty,
            is_extra: false,
          };
        }).filter((e) => e.quantity > 0);
      }

      // Fallback: no individual line IDs available (aggregated only)
      return [{ item: row.itemId, quantity: qty, is_extra: false }];
    });

    // Extra items: include any rows the user already added, plus the current draft
    const extraCandidates: ExtraDraft[] = [...extraRows];
    const draftItem = extraDraft.item.trim();
    const draftQty = Number.parseFloat(extraDraft.quantity.trim());
    if (draftItem && Number.isFinite(draftQty) && draftQty > 0) {
      extraCandidates.push({ id: extraDraft.id ?? `draft-${Date.now()}`, item: draftItem, quantity: String(draftQty) });
    }

    const validExtra = extraCandidates
      .map((row) => ({
        item: Number.parseInt(row.item, 10),
        quantity: Number.parseFloat(row.quantity.trim()),
        is_extra: true,
      }))
      .filter((row) => Number.isFinite(row.item) && row.item > 0 && Number.isFinite(row.quantity) && row.quantity > 0);

    const payload: MaterialRequestDispatchPayload = {
      material_request: detail.id,
      dispatch_date: dispatchDate,
      notes: notes.trim(),
      // Merge regular lines + extra items into a single lines array
      lines: [
        ...lineEntries,
        ...validExtra.map((e) => ({ item: e.item, quantity: e.quantity, is_extra: true })),
      ],
      extra_items: validExtra,
    };

    if (payload.lines.length === 0 && (payload.extra_items?.length ?? 0) === 0) return;

    setSaving(true);
    try {
      await dispatchMaterialRequest(detail.id, detail, payload, itemLabelById);
      await playFlyToNavCelebration({
        targetSelector: '[data-nav="dispatches"]',
        fromEl: confirmOriginRef.current,
        label: dispatchT("flyCardLabel"),
        sound: true,
      });
      toastSuccess(dispatchT("successToast"));
      router.replace(routes.dashboard.dispatches);
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
        title={dispatchT("pageTitle")}
        subtitle={
          detail
            ? dispatchT("pageSubtitle", { requestNumber: detail.request_number })
            : dispatchT("pageSubtitleGeneric")
        }
        backHref={safeBack}
        backAriaLabel={dispatchT("backAria")}
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
              onClick={(e) => {
                confirmOriginRef.current = e.currentTarget as HTMLElement;
                void handleSubmit();
              }}
            >
              {dispatchT("confirm")}
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
            <p className="text-sm text-slate-600 dark:text-slate-400">{dispatchT("pageHint")}</p>

            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">{dispatchT("sectionLines")}</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                      <th className="px-3 py-2">{t("lineItems.itemDetails")}</th>
                      <th className={quantityTableHeaderClass}>{dispatchT("requested")}</th>
                      <th className={quantityTableHeaderClass}>{dispatchT("dispatched")}</th>
                      <th className={quantityTableHeaderClass}>{dispatchT("pending")}</th>
                      <th className={cn(quantityTableHeaderClass, "w-36")}>{dispatchT("dispatchNow")}</th>
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
                        const qty = Number.parseFloat(row.dispatchQty.trim());
                        const dispatchSurplus =
                          Number.isFinite(qty) && qty > row.pending ? qty - row.pending : 0;
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
                                fulfilled={row.fulfilled}
                                surplus={row.surplus}
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
                                {dispatchSurplus > 0 ? (
                                  <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                    +{dispatchSurplus.toFixed(0)} {t("lineItems.units")}
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
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">{dispatchT("sectionExtra")}</h2>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <CheckmarkSelect
                    listLabel={dispatchT("extraItem")}
                    buttonAriaLabel={dispatchT("extraItem")}
                    options={extraItemOptions}
                    value={extraDraft.item}
                    emptyLabel={t("placeholders.item")}
                    portaled
                    searchable
                    size="sm"
                    disabled={saving || extraItemOptions.length === 0}
                    onChange={(v) => setExtraDraft((prev) => ({ ...prev, item: v }))}
                    onAdd={itemQuickCreate.onAdd}
                    addAriaLabel={itemQuickCreate.addAriaLabel}
                    addLabel={itemQuickCreate.addLabel}
                  />
                </div>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={extraDraft.quantity}
                  disabled={saving}
                  placeholder={dispatchT("extraQty")}
                  className={cn(compactInputClass, "w-24")}
                  onChange={(e) => setExtraDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                />
                <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={addExtraRow}>
                  <Plus className="size-4" aria-hidden />
                  {dispatchT("addExtra")}
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
                          aria-label={dispatchT("removeExtra")}
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

            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">{dispatchT("sectionNotes")}</h2>
              <textarea
                value={notes}
                disabled={saving}
                maxLength={FIELD_MAX_LENGTH.DESCRIPTION}
                onChange={(e) => setNotes(sanitizeDescriptionInput(e.target.value))}
                placeholder={dispatchT("notesPlaceholder")}
                className={cn(surfaceInputClassName, "min-h-[120px] w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700")}
              />
            </section>
          </div>
        )}
      </SurfaceShell>
    </div>
  );
}
