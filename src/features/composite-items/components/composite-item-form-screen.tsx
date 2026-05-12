"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  createCompositeItem,
  fetchCompositeItem,
  updateCompositeItem,
} from "@/features/composite-items/api/composite-item.api";
import { fetchItemsPage } from "@/features/items/api/item.api";
import { cn } from "@/core/utils/http.util";
import type { ItemComponentRef } from "@/features/items/types/item.types";
import type { Item } from "@/features/items/types/item.types";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import {
  AppButton,
  CheckmarkSelect,
  type CheckmarkSelectOption,
  FieldLabel,
  fieldErrorTextClassName,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  itemId?: number;
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

export function CompositeItemFormScreen({ mode, itemId }: Props) {
  const t = useTranslations("Dashboard.compositeItems");
  const tModal = useTranslations("Dashboard.compositeItems.modal");
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "composite-items");
  const isEdit = mode === "edit";

  const nameId = React.useId();
  const skuId = React.useId();
  const qtyId = React.useId();
  const costId = React.useId();
  const sellId = React.useId();

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [qty, setQty] = React.useState("0");
  const [cost, setCost] = React.useState("0");
  const [sell, setSell] = React.useState("0");
  const [rows, setRows] = React.useState<ComponentRow[]>([{ id: nextRowId(), child_item: "", quantity: "1" }]);
  const [itemOptions, setItemOptions] = React.useState<Item[]>([]);
  const [itemsError, setItemsError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [nameTouched, setNameTouched] = React.useState(false);
  const [skuTouched, setSkuTouched] = React.useState(false);
  const [componentsTouched, setComponentsTouched] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);

  const nameInvalid = nameTouched && name.trim().length === 0;
  const skuInvalid = skuTouched && sku.trim().length === 0;
  const hasAtLeastOneComponentItem = rows.some((r) => r.child_item.trim().length > 0);
  const componentsInvalid = componentsTouched && !hasAtLeastOneComponentItem;
  const itemSelectOptions = React.useMemo<CheckmarkSelectOption[]>(
    () => itemOptions.map((it) => ({ value: String(it.id), label: it.name })),
    [itemOptions],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setItemsError(null);
      try {
        const { items: next } = await fetchItemsPage(1, 500, { isComposite: false });
        if (!cancelled) setItemOptions(next);
      } catch {
        if (!cancelled) setItemsError(tModal("itemsLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tModal]);

  React.useEffect(() => {
    if (!isEdit || !itemId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const item = await fetchCompositeItem(itemId);
        if (!cancelled) {
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
          setNameTouched(false);
          setSkuTouched(false);
          setComponentsTouched(false);
        }
      } catch {
        if (!cancelled) setScreenError(t("loadError"));
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, itemId, t]);

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
      const saved =
        isEdit && itemId
          ? await updateCompositeItem(itemId, {
              name: name.trim(),
              sku: sku.trim(),
              quantity: qtyN,
              cost_price: costN,
              selling_price: sellN,
              components: comps,
            })
          : await createCompositeItem({
              name: name.trim(),
              sku: sku.trim(),
              quantity: qtyN,
              cost_price: costN,
              selling_price: sellN,
              components: comps,
            });
      toastSuccess(isEdit ? tModal("updatedToast") : tModal("createdToast"));
      router.replace(`${safeBack}?highlight=${saved.id}`);
    } catch {
      toastError(t("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

  const noItems = itemOptions.length === 0;

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="md" disabled={submitting} onClick={() => router.push(safeBack)}>
              {tModal("cancel")}
            </AppButton>
            <AppButton type="submit" form="composite-item-form-screen" variant="primary" size="md" loading={submitting} disabled={noItems}>
              {isEdit ? tModal("saveChanges") : tModal("save")}
            </AppButton>
          </div>
        }
      />
      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loadingExisting ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : screenError ? (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{screenError}</p>
          </div>
        ) : (
          <form id="composite-item-form-screen" className="space-y-5 p-4 sm:p-6" onSubmit={(e) => void submit(e)}>
            <div>
              <FieldLabel htmlFor={nameId} required>{tModal("name")}</FieldLabel>
              <input id={nameId} type="text" autoComplete="off" value={name} onChange={(e) => setName(capitalizeFirstLetter(e.target.value))} onBlur={() => setNameTouched(true)} disabled={submitting} placeholder={tModal("namePlaceholder")} className={surfaceInputClassName} />
              {nameInvalid ? <p className={fieldErrorTextClassName}>{tModal("nameError")}</p> : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor={skuId} required>{tModal("sku")}</FieldLabel>
                <input id={skuId} type="text" autoComplete="off" value={sku} onChange={(e) => setSku(e.target.value)} onBlur={() => setSkuTouched(true)} disabled={submitting} placeholder={tModal("skuPlaceholder")} className={cn(surfaceInputClassName, skuInvalid && "border-red-500 focus:border-red-500 focus:ring-red-500/20")} />
                {skuInvalid ? <p className={fieldErrorTextClassName}>{tModal("skuError")}</p> : null}
              </div>
              <div>
                <FieldLabel htmlFor={qtyId} required>{tModal("quantity")}</FieldLabel>
                <input id={qtyId} type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} disabled={submitting} className={surfaceInputClassName} min={0} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor={costId} required>{tModal("costPrice")}</FieldLabel>
                <input id={costId} type="number" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} disabled={submitting} className={surfaceInputClassName} min={0} step="0.01" />
              </div>
              <div>
                <FieldLabel htmlFor={sellId} required>{tModal("sellingPrice")}</FieldLabel>
                <input id={sellId} type="number" inputMode="decimal" value={sell} onChange={(e) => setSell(e.target.value)} disabled={submitting} className={surfaceInputClassName} min={0} step="0.01" />
              </div>
            </div>
            <div>
              <FieldLabel>{tModal("components")}</FieldLabel>
              {itemsError ? <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{itemsError}</p> : null}
              <div className="mt-2 space-y-2">
                {rows.map((r, idx) => (
                  <div key={r.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                    <div>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{tModal("childItem")}<span className="ml-1 text-red-500">*</span></span>
                      <CheckmarkSelect listLabel={tModal("childItem")} buttonAriaLabel={tModal("childItem")} value={r.child_item} onChange={(v) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, child_item: v } : x)))} options={itemSelectOptions} emptyLabel={tModal("childItemPlaceholder")} disabled={submitting || noItems} portaled className="w-full" />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{tModal("componentQuantity")}</span>
                      <input type="number" min={1} inputMode="numeric" value={r.quantity} onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, quantity: e.target.value } : x)))} disabled={submitting} className={surfaceInputClassName} />
                    </div>
                    <div className="flex gap-2 sm:justify-end">
                      <AppButton type="button" variant="secondary" size="sm" onClick={() => setRows((prev) => normalizeRows(prev.filter((x) => x.id !== r.id)))} disabled={submitting || rows.length <= 1}>{tModal("removeComponent")}</AppButton>
                      {idx === rows.length - 1 ? <AppButton type="button" variant="secondary" size="sm" onClick={() => setRows((prev) => [...prev, { id: nextRowId(), child_item: "", quantity: "1" }])} disabled={submitting}>{tModal("addComponent")}</AppButton> : null}
                    </div>
                  </div>
                ))}
              </div>
              {componentsInvalid ? <p className={fieldErrorTextClassName}>{tModal("atLeastOneComponentError")}</p> : null}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tModal("componentsHint")}</p>
            </div>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
