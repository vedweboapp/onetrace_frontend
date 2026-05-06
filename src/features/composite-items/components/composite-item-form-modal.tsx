"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  createCompositeItem,
  updateCompositeItem,
} from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { cn } from "@/core/utils/http.util";
import type { ItemComponentRef } from "@/features/items/types/item.types";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  type CheckmarkSelectOption,
  FieldLabel,
  fieldErrorTextClassName,
  surfaceInputClassName,
} from "@/shared/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  item: CompositeItem | null;
  onSaved: () => void;
};

type ComponentRow = { id: string; child_item: string; quantity: string };

function nextRowId(): string {
  return `comp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumberOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function CompositeItemFormModal({ open, onClose, mode, item, onSaved }: Props) {
  const t = useTranslations("Dashboard.compositeItems.modal");

  const nameId = React.useId();
  const skuId = React.useId();
  const qtyId = React.useId();
  const costId = React.useId();
  const sellId = React.useId();

  const [name, setName] = React.useState(() => (mode === "edit" && item ? item.name : ""));
  const [sku, setSku] = React.useState(() => (mode === "edit" && item ? String(item.sku ?? "") : ""));
  const [qty, setQty] = React.useState(() => (mode === "edit" && item ? String(item.quantity ?? 0) : "0"));
  const [cost, setCost] = React.useState(() => (mode === "edit" && item ? String(item.cost_price ?? 0) : "0"));
  const [sell, setSell] = React.useState(() => (mode === "edit" && item ? String(item.selling_price ?? 0) : "0"));
  const [rows, setRows] = React.useState<ComponentRow[]>(() => {
    const comps = mode === "edit" && item?.components ? item.components : [];
    if (!comps || comps.length === 0) return [{ id: nextRowId(), child_item: "", quantity: "1" }];
    return comps.map((c) => ({ id: nextRowId(), child_item: String(c.child_item), quantity: String(c.quantity) }));
  });
  const [itemOptions, setItemOptions] = React.useState<Item[]>([]);
  const [itemsError, setItemsError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [nameTouched, setNameTouched] = React.useState(false);
  const [skuTouched, setSkuTouched] = React.useState(false);
  const [componentsTouched, setComponentsTouched] = React.useState(false);

  const nameInvalid = nameTouched && name.trim().length === 0;
  const skuInvalid = skuTouched && sku.trim().length === 0;
  const hasAtLeastOneComponentItem = rows.some((r) => r.child_item.trim().length > 0);
  const componentsInvalid = componentsTouched && !hasAtLeastOneComponentItem;

  const itemLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const it of itemOptions) m[it.id] = it.name;
    return m;
  }, [itemOptions]);
  const itemSelectOptions = React.useMemo<CheckmarkSelectOption[]>(
    () => itemOptions.map((it) => ({ value: String(it.id), label: itemLabelById[it.id] ?? it.name })),
    [itemLabelById, itemOptions],
  );

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && item) {
      setName(item.name ?? "");
      setSku(String(item.sku ?? ""));
      setQty(String(item.quantity ?? 0));
      setCost(String(item.cost_price ?? 0));
      setSell(String(item.selling_price ?? 0));
      const comps = item.components ?? [];
      setRows(
        comps.length > 0
          ? comps.map((c) => ({ id: nextRowId(), child_item: String(c.child_item), quantity: String(c.quantity) }))
          : [{ id: nextRowId(), child_item: "", quantity: "1" }],
      );
    } else {
      setName("");
      setSku("");
      setQty("0");
      setCost("0");
      setSell("0");
      setRows([{ id: nextRowId(), child_item: "", quantity: "1" }]);
    }
    setNameTouched(false);
    setSkuTouched(false);
  }, [open, mode, item]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open) return;
    (async () => {
      setItemsError(null);
      try {
        const { items: next } = await fetchItemsPage(1, 500, { isComposite: false });
        if (!cancelled) setItemOptions(next);
      } catch {
        if (!cancelled) setItemsError(t("itemsLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  function normalizeRows(next: ComponentRow[]): ComponentRow[] {
    if (next.length === 0) return [{ id: nextRowId(), child_item: "", quantity: "1" }];
    return next;
  }

  function buildComponents(): ItemComponentRef[] | null {
    const out: ItemComponentRef[] = [];
    for (const r of rows) {
      const cid = toNumberOrNull(r.child_item);
      const q = toNumberOrNull(r.quantity);
      if (cid == null) return null;
      if (q == null || q <= 0) return null;
      out.push({ child_item: cid, quantity: q });
    }
    return out;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    setSkuTouched(true);
    setComponentsTouched(true);
    const qtyN = Number(qty);
    const costN = Number(cost);
    const sellN = Number(sell);
    if (!name.trim() || !sku.trim()) return;
    if (!Number.isFinite(qtyN) || qtyN < 0) return;
    if (!Number.isFinite(costN) || costN < 0) return;
    if (!Number.isFinite(sellN) || sellN < 0) return;
    if (!hasAtLeastOneComponentItem) return;

    const comps = buildComponents();
    if (!comps) return;

    setSubmitting(true);
    try {
      if (mode === "edit" && item) {
        await updateCompositeItem(item.id, {
          name: name.trim(),
          sku: sku.trim(),
          quantity: qtyN,
          cost_price: costN,
          selling_price: sellN,
          components: comps,
        });
        toastSuccess(t("updatedToast"));
      } else {
        await createCompositeItem({
          name: name.trim(),
          sku: sku.trim(),
          quantity: qtyN,
          cost_price: costN,
          selling_price: sellN,
          components: comps,
        });
        toastSuccess(t("createdToast"));
      }
      onSaved();
      onClose();
    } catch {
      /* axios interceptor toast */
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseAttempt() {
    if (!submitting) onClose();
  }

  const noItems = itemOptions.length === 0;

  return (
    <AppModal
      open={open}
      onClose={handleCloseAttempt}
      title={mode === "edit" ? t("editTitle") : t("createTitle")}
      size="lg"
      showCloseButton
      closeOnBackdrop={!submitting}
      isBusy={submitting}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="md" disabled={submitting} onClick={handleCloseAttempt}>
            {t("cancel")}
          </AppButton>
          <AppButton
            type="submit"
            form="composite-item-form"
            variant="primary"
            size="md"
            loading={submitting}
            disabled={noItems}
          >
            {mode === "edit" ? t("saveChanges") : t("save")}
          </AppButton>
        </>
      }
    >
      <form id="composite-item-form" className="space-y-5" onSubmit={(e) => void submit(e)}>
        <div>
          <FieldLabel htmlFor={nameId} required>
            {t("name")}
          </FieldLabel>
          <input
            id={nameId}
            type="text"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            disabled={submitting}
            placeholder={t("namePlaceholder")}
            className={surfaceInputClassName}
          />
          {nameInvalid ? <p className={fieldErrorTextClassName}>{t("nameError")}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor={skuId} required>
              {t("sku")}
            </FieldLabel>
            <input
              id={skuId}
              type="text"
              autoComplete="off"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              onBlur={() => setSkuTouched(true)}
              disabled={submitting}
              placeholder={t("skuPlaceholder")}
              className={cn(surfaceInputClassName, skuInvalid && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
            />
            {skuInvalid ? <p className={fieldErrorTextClassName}>{t("skuError")}</p> : null}
          </div>
          <div>
            <FieldLabel htmlFor={qtyId} required>
              {t("quantity")}
            </FieldLabel>
            <input
              id={qtyId}
              type="number"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              disabled={submitting}
              className={surfaceInputClassName}
              min={0}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor={costId} required>
              {t("costPrice")}
            </FieldLabel>
            <input
              id={costId}
              type="number"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              disabled={submitting}
              className={surfaceInputClassName}
              min={0}
              step="0.01"
            />
          </div>
          <div>
            <FieldLabel htmlFor={sellId} required>
              {t("sellingPrice")}
            </FieldLabel>
            <input
              id={sellId}
              type="number"
              inputMode="decimal"
              value={sell}
              onChange={(e) => setSell(e.target.value)}
              disabled={submitting}
              className={surfaceInputClassName}
              min={0}
              step="0.01"
            />
          </div>
        </div>

        <div>
          <FieldLabel>{t("components")}</FieldLabel>
          {itemsError ? (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{itemsError}</p>
          ) : null}
          <div className="mt-2 space-y-2">
            {rows.map((r, idx) => (
              <div key={r.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("childItem")}
                    <span className="ml-1 text-red-500">*</span>
                  </span>
                  <CheckmarkSelect
                    listLabel={t("childItem")}
                    buttonAriaLabel={t("childItem")}
                    value={r.child_item}
                    onChange={(v) => {
                      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, child_item: v } : x)));
                    }}
                    options={itemSelectOptions}
                    emptyLabel={t("childItemPlaceholder")}
                    disabled={submitting || noItems}
                    portaled
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("componentQuantity")}
                  </span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={r.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, quantity: v } : x)));
                    }}
                    disabled={submitting}
                    className={surfaceInputClassName}
                  />
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setRows((prev) => normalizeRows(prev.filter((x) => x.id !== r.id)))}
                    disabled={submitting || rows.length <= 1}
                  >
                    {t("removeComponent")}
                  </AppButton>
                  {idx === rows.length - 1 ? (
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setRows((prev) => [...prev, { id: nextRowId(), child_item: "", quantity: "1" }])}
                      disabled={submitting}
                    >
                      {t("addComponent")}
                    </AppButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {componentsInvalid ? <p className={fieldErrorTextClassName}>{t("atLeastOneComponentError")}</p> : null}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("componentsHint")}</p>
        </div>
      </form>
    </AppModal>
  );
}
