"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fetchGroupsPage } from "@/features/groups/api/group.api";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Job, JobMetaPayload } from "@/features/jobs/types/job.types";
import {
  buildJobMetaPayload,
  normalizeJobMeta,
  resolveJobMetaCompositeGroupLabel,
  resolveJobMetaCompositeItemId,
  type JobMetaFormRow,
} from "@/features/jobs/utils/job-meta-payload.util";
import { jobToFormDefaults } from "@/features/jobs/utils/job-form-map";
import { formatMoneyDisplay, parseMoneyValue } from "@/features/invoices/utils/invoice-money.util";
import { DetailEntityLink } from "@/shared/components/entity";
import { DetailPanelCard } from "@/shared/components/layout/detail-metric-card";
import {
  DetailLinkedTable,
  DetailLinkedTableRow,
  DetailLinkedTableTd,
  detailLinkedTableCellClassName,
} from "@/shared/components/layout/detail-linked-table";
import { routes } from "@/shared/config/routes";
import { AppButton, CheckmarkSelect, NumericInput } from "@/shared/ui";
import { MoneyInput } from "@/shared/ui/money-input";
import { ensureCheckmarkOption } from "@/shared/utils/checkmark-options.util";
import { checkmarkOptionsExcludingUsed } from "@/shared/utils/checkmark-options-excluding.util";
import type { ReactNode } from "react";

type Option = { value: string; label: string };

type DraftRow = JobMetaFormRow & { key: string };

function emptyRow(): DraftRow {
  return {
    key: `new-${Math.random().toString(36).slice(2, 9)}`,
    group: "",
    group_name: "",
    item: "",
    item_name: "",
    quantity: "1",
    rate: "",
  };
}

function rowsFromDetail(detail: Job): DraftRow[] {
  const defaults = jobToFormDefaults(detail).job_meta_items;
  const mapped = defaults
    .filter((row) => row.item.trim() || row.group.trim() || row.quantity.trim())
    .map((row, index) => ({
      ...row,
      key: `${row.item || "row"}-${index}`,
    }));
  return mapped.length > 0 ? mapped : [emptyRow()];
}

export function JobDetailWorkScopeEditor({
  title,
  detail,
  onSave,
}: {
  title: ReactNode;
  detail: Job;
  onSave: (job_meta: JobMetaPayload) => Promise<void>;
}) {
  const t = useTranslations("Dashboard.jobs");
  const tActions = useTranslations("Dashboard.common.actions");
  const locale = useLocale();

  const meta = normalizeJobMeta(detail.job_meta);
  const compositeRows = meta?.composite_items ?? [];
  const scopeTotal =
    meta?.total != null && Number.isFinite(meta.total)
      ? meta.total
      : compositeRows.reduce(
          (sum, row) => sum + (row.amount != null && Number.isFinite(row.amount) ? row.amount : 0),
          0,
        );

  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draftRows, setDraftRows] = React.useState<DraftRow[]>([]);
  const [groupOptions, setGroupOptions] = React.useState<Option[]>([]);
  const [itemOptions, setItemOptions] = React.useState<Option[]>([]);
  const [itemPriceById, setItemPriceById] = React.useState<Map<number, number>>(() => new Map());
  const [itemGroupById, setItemGroupById] = React.useState<Map<number, number | null>>(() => new Map());
  const [nameById, setNameById] = React.useState<Map<number, string>>(() => new Map());

  const groupLabelById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const o of groupOptions) m.set(o.value, o.label);
    return m;
  }, [groupOptions]);

  const itemLabelById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const o of itemOptions) m.set(o.value, o.label);
    return m;
  }, [itemOptions]);

  const usedItemIds = React.useMemo(
    () => draftRows.map((row) => row.item.trim()).filter((id) => id.length > 0),
    [draftRows],
  );

  const draftTotal = React.useMemo(
    () =>
      draftRows.reduce((sum, row) => {
        const qty = parseMoneyValue(row.quantity);
        const rate = parseMoneyValue(row.rate);
        return sum + qty * rate;
      }, 0),
    [draftRows],
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [groups, items] = await Promise.all([
          fetchGroupsPage(1, 500),
          fetchItemsPage(1, 500, { isActive: true }),
        ]);
        if (cancelled) return;
        setGroupOptions(groups.items.map((g) => ({ value: String(g.id), label: g.name })));
        setItemOptions(
          items.items.map((it) => ({
            value: String(it.id),
            label: it.name?.trim() || it.sku?.trim() || `#${it.id}`,
          })),
        );
        const prices = new Map<number, number>();
        const groupMap = new Map<number, number | null>();
        const names = new Map<number, string>();
        for (const it of items.items) {
          const raw = it.selling_price;
          const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
          if (Number.isFinite(n)) prices.set(it.id, n);
          groupMap.set(it.id, typeof it.group === "number" ? it.group : null);
          names.set(it.id, it.name?.trim() || it.sku?.trim() || `#${it.id}`);
        }
        setItemPriceById(prices);
        setItemGroupById(groupMap);
        setNameById(names);
      } catch {
        if (!cancelled) {
          setGroupOptions([]);
          setItemOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function itemOptionsForGroup(groupIdRaw: string): Option[] {
    if (!/^\d+$/.test(groupIdRaw)) return itemOptions;
    const gid = Number.parseInt(groupIdRaw, 10);
    return itemOptions.filter((opt) => (itemGroupById.get(Number.parseInt(opt.value, 10)) ?? null) === gid);
  }

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setDraftRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function startEdit() {
    setDraftRows(rowsFromDetail(detail));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraftRows([]);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = buildJobMetaPayload(draftRows) ?? { composite_items: [], total: 0 };
      await onSave(payload);
      setEditing(false);
      setDraftRows([]);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <DetailPanelCard
        title={title}
        headerRight={
          <AppButton type="button" variant="secondary" size="sm" onClick={startEdit}>
            {compositeRows.length === 0 ? t("lineItems.addItem") : tActions("edit")}
          </AppButton>
        }
      >
        {compositeRows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("lineItems.empty")}</p>
        ) : (
          <div className="space-y-3">
            <DetailLinkedTable
              showRowNumbers={false}
              tableClassName="min-w-[720px]"
              columns={[
                { id: "group", header: t("fields.plotGroup"), widthClass: "w-[20%]" },
                { id: "name", header: t("fields.compositeItem"), widthClass: "w-[32%]" },
                { id: "qty", header: t("lineItems.qty"), narrow: true, align: "right", widthClass: "w-24" },
                { id: "unit", header: t("lineItems.rate"), narrow: true, align: "right", widthClass: "w-32" },
                { id: "amount", header: t("lineItems.amount"), narrow: true, align: "right", widthClass: "w-32" },
              ]}
            >
              {compositeRows.map((row, index) => {
                const qty = Number.isFinite(row.quantity) ? row.quantity : 0;
                const lineTotal =
                  row.amount != null && Number.isFinite(row.amount) ? row.amount : 0;
                const unitFromAmount = qty > 0 && lineTotal > 0 ? lineTotal / qty : 0;
                const unitFromPrice =
                  typeof row.selling_price === "number" && Number.isFinite(row.selling_price)
                    ? row.selling_price
                    : row.item &&
                        typeof row.item === "object" &&
                        typeof row.item.selling_price === "number" &&
                        Number.isFinite(row.item.selling_price)
                      ? row.item.selling_price
                      : 0;
                const unit = unitFromAmount > 0 ? unitFromAmount : unitFromPrice;
                const amount = lineTotal > 0 ? lineTotal : unit > 0 ? unit * qty : 0;
                const itemId = resolveJobMetaCompositeItemId(row);
                const name =
                  row.name?.trim() ||
                  (row.item && typeof row.item === "object" && row.item.name?.trim()) ||
                  (itemId != null ? nameById.get(itemId) : undefined) ||
                  "—";
                const groupName = resolveJobMetaCompositeGroupLabel(row, groupLabelById);
                return (
                  <DetailLinkedTableRow key={`${itemId ?? "row"}-${index}`} index={index}>
                    <DetailLinkedTableTd
                      className={detailLinkedTableCellClassName({
                        cellClassName: "align-middle text-slate-700 dark:text-slate-300",
                      })}
                    >
                      <span className="block truncate" title={groupName !== "—" ? groupName : undefined}>
                        {groupName}
                      </span>
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      className={detailLinkedTableCellClassName({
                        cellClassName: "align-middle font-medium text-slate-900 dark:text-slate-100",
                      })}
                    >
                      {itemId != null ? (
                        <DetailEntityLink
                          href={`${routes.dashboard.items}/${itemId}`}
                          className="block truncate text-blue-600 underline-offset-2 hover:underline"
                          title={name !== "—" ? name : undefined}
                        >
                          {name}
                        </DetailEntityLink>
                      ) : (
                        <span className="block truncate" title={name !== "—" ? name : undefined}>
                          {name}
                        </span>
                      )}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({
                        align: "right",
                        narrow: true,
                        cellClassName: "align-middle tabular-nums",
                      })}
                    >
                      {qty || "—"}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({
                        align: "right",
                        narrow: true,
                        cellClassName: "align-middle tabular-nums",
                      })}
                    >
                      {unit > 0 ? formatMoneyDisplay(unit, locale) : "—"}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({
                        align: "right",
                        narrow: true,
                        cellClassName: "align-middle tabular-nums font-medium",
                      })}
                    >
                      {amount > 0 ? formatMoneyDisplay(amount, locale) : "—"}
                    </DetailLinkedTableTd>
                  </DetailLinkedTableRow>
                );
              })}
            </DetailLinkedTable>
            <div className="ml-auto max-w-xs rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between gap-6">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {t("fields.scopeTotal")}
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {formatMoneyDisplay(scopeTotal, locale)}
                </span>
              </div>
            </div>
          </div>
        )}
      </DetailPanelCard>
    );
  }

  return (
    <DetailPanelCard
      title={title}
      headerRight={
        <div className="flex flex-wrap items-center gap-2">
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={cancelEdit}>
            {tActions("cancel")}
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" loading={saving} onClick={() => void save()}>
            {tActions("save")}
          </AppButton>
        </div>
      }
    >
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={saving}
          onClick={() => setDraftRows((prev) => [...prev, emptyRow()])}
        >
          <Plus className="size-4" aria-hidden />
          {t("lineItems.addItem")}
        </AppButton>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
              <th className="px-3 py-2">{t("fields.plotGroup")}</th>
              <th className="px-3 py-2">{t("fields.compositeItem")}</th>
              <th className="px-3 py-2">{t("lineItems.qty")}</th>
              <th className="px-3 py-2">{t("lineItems.rate")}</th>
              <th className="px-3 py-2">{t("lineItems.amount")}</th>
              <th className="px-3 py-2 w-12" />
            </tr>
          </thead>
          <tbody>
            {draftRows.map((row, index) => {
              const qty = parseMoneyValue(row.quantity);
              const rate = parseMoneyValue(row.rate);
              const amount = qty * rate;
              const filteredItems = checkmarkOptionsExcludingUsed(
                ensureCheckmarkOption(itemOptionsForGroup(row.group), row.item, row.item_name),
                usedItemIds,
                row.item,
              );
              return (
                <tr key={row.key} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 align-top">
                    <CheckmarkSelect
                      options={groupOptions}
                      value={row.group}
                      fallbackLabel={row.group_name}
                      onChange={(v) =>
                        updateRow(index, {
                          group: v,
                          group_name: v ? (groupLabelById.get(v) ?? "") : "",
                          item: "",
                          item_name: "",
                          rate: "",
                        })
                      }
                      emptyLabel={t("placeholders.plotGroup")}
                      disabled={saving}
                      portaled
                      searchable
                      size="sm"
                      clearable
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <CheckmarkSelect
                      options={filteredItems}
                      value={row.item}
                      fallbackLabel={row.item_name}
                      onChange={(v) => {
                        const patch: Partial<DraftRow> = {
                          item: v,
                          item_name: v ? (itemLabelById.get(v) ?? "") : "",
                        };
                        if (v && /^\d+$/.test(v)) {
                          const itemId = Number.parseInt(v, 10);
                          const price = itemPriceById.get(itemId);
                          const linkedGroupId = itemGroupById.get(itemId);
                          if (linkedGroupId != null && linkedGroupId > 0) {
                            const groupKey = String(linkedGroupId);
                            patch.group = groupKey;
                            patch.group_name = groupLabelById.get(groupKey) ?? "";
                          }
                          if (!Number.isFinite(qty) || qty <= 0) patch.quantity = "1";
                          if (price != null && Number.isFinite(price)) patch.rate = String(price);
                        }
                        updateRow(index, patch);
                      }}
                      emptyLabel={t("placeholders.compositeItem")}
                      disabled={saving}
                      portaled
                      searchable
                      size="sm"
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <NumericInput
                      size="sm"
                      integer
                      value={row.quantity}
                      disabled={saving}
                      onChange={(next) => updateRow(index, { quantity: next })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <MoneyInput size="sm" readOnly tabIndex={-1} aria-readonly value={row.rate ?? ""} />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex h-8 items-center tabular-nums font-medium">
                      {formatMoneyDisplay(amount, locale)}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving || draftRows.length <= 1}
                      onClick={() => setDraftRows((prev) => prev.filter((_, i) => i !== index))}
                      aria-label={t("lineItems.remove")}
                    >
                      <Trash2 className="size-4 text-red-600" aria-hidden />
                    </AppButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ml-auto max-w-xs rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{t("fields.scopeTotal")}</span>
          <span className="text-xl font-bold tabular-nums">{formatMoneyDisplay(draftTotal, locale)}</span>
        </div>
      </div>
    </div>
    </DetailPanelCard>
  );
}
