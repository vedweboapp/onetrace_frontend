"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  createCompositeItem,
  fetchCompositeItem,
  updateCompositeItem,
} from "@/features/composite-items/api/composite-item.api";
import { fetchInstallationTypesPage } from "@/features/installation-types/api/installation-type.api";
import { getInstallationTypeId } from "@/features/items/utils/item-installation-type.util";
import { formatInstallationTypeLabel } from "@/features/installation-types/utils/installation-type-display.util";
import { fetchItemsPage } from "@/features/items/api/item.api";
import { cn } from "@/core/utils/http.util";
import type { ItemComponentRef } from "@/features/items/types/item.types";
import type { Item } from "@/features/items/types/item.types";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { clearQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";
import {
  buildQuickCreateReturnHref,
  resolveFormBackUrl,
  sanitizeInternalDashboardBack,
} from "@/shared/utils/quick-create-navigation.util";
import { checkmarkOptionsExcludingUsed } from "@/shared/utils/checkmark-options-excluding.util";
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

function installationTypeIdPayload(value: string): { installation_type?: number } {
  const id = toNumberOrNull(value);
  if (id == null || id <= 0) return {};
  return { installation_type: id };
}

export function CompositeItemFormScreen({ mode, itemId }: Props) {
  const t = useTranslations("Dashboard.compositeItems");
  const tModal = useTranslations("Dashboard.compositeItems.modal");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = resolveFormBackUrl(searchParams.get("back"), "composite-items", routes.dashboard.compositeItems);
  const isEdit = mode === "edit";
  const pendingItemRowRef = React.useRef<string | null>(null);

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
  const [installationType, setInstallationType] = React.useState("");
  const [installationTypeOptions, setInstallationTypeOptions] = React.useState<CheckmarkSelectOption[]>([]);
  const [installationTypesError, setInstallationTypesError] = React.useState<string | null>(null);
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

  const draftReturnTo = React.useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const getFormDraft = React.useCallback(
    () => ({ name, sku, qty, cost, sell, installationType, rows }),
    [name, sku, qty, cost, sell, installationType, rows],
  );

  const restoreFormDraft = React.useCallback((draft: unknown) => {
    const saved = draft as {
      name?: string;
      sku?: string;
      qty?: string;
      cost?: string;
      sell?: string;
      installationType?: string;
      rows?: ComponentRow[];
    };
    if (typeof saved.name === "string") setName(saved.name);
    if (typeof saved.sku === "string") setSku(saved.sku);
    if (typeof saved.qty === "string") setQty(saved.qty);
    if (typeof saved.cost === "string") setCost(saved.cost);
    if (typeof saved.sell === "string") setSell(saved.sell);
    if (typeof saved.installationType === "string") setInstallationType(saved.installationType);
    if (Array.isArray(saved.rows) && saved.rows.length > 0) setRows(saved.rows);
  }, []);

  const reloadItems = React.useCallback(async () => {
    setItemsError(null);
    try {
      const { items: next } = await fetchItemsPage(1, 500, { isComposite: false });
      setItemOptions(next);
    } catch {
      setItemsError(tModal("itemsLoadError"));
    }
  }, [tModal]);

  const itemQuickCreate = useQuickCreate({
    kind: "item",
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });

  useQuickCreateReturn({
    restoreFormDraft: !isEdit ? restoreFormDraft : undefined,
    onReloadOptions: reloadItems,
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget !== "item") return;
      const rowId = pendingItemRowRef.current;
      if (rowId) {
        setRows((prev) => prev.map((x) => (x.id === rowId ? { ...x, child_item: selectId } : x)));
      } else {
        setRows((prev) => {
          const emptyIdx = prev.findIndex((r) => !r.child_item.trim());
          if (emptyIdx >= 0) {
            return prev.map((x, i) => (i === emptyIdx ? { ...x, child_item: selectId } : x));
          }
          return [...prev, { id: nextRowId(), child_item: selectId, quantity: "1" }];
        });
      }
      pendingItemRowRef.current = null;
    },
  });

  const itemOptionsForRow = React.useCallback(
    (rowId: string) =>
      checkmarkOptionsExcludingUsed(
        itemSelectOptions,
        rows.filter((r) => r.id !== rowId).map((r) => r.child_item),
        rows.find((r) => r.id === rowId)?.child_item ?? "",
      ),
    [itemSelectOptions, rows],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setItemsError(null);
      setInstallationTypesError(null);
      try {
        const [itemsRes, installationTypesRes] = await Promise.all([
          fetchItemsPage(1, 500, { isComposite: false }),
          fetchInstallationTypesPage(1, 500, { is_active: true }),
        ]);
        if (!cancelled) {
          setItemOptions(itemsRes.items);
          setInstallationTypeOptions(
            installationTypesRes.items.map((row) => ({
              value: String(row.id),
              label: formatInstallationTypeLabel(row),
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setItemsError(tModal("itemsLoadError"));
          setInstallationTypesError(tModal("installationTypesLoadError"));
        }
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
          const installationTypeId = getInstallationTypeId(item.installation_type);
          setInstallationType(installationTypeId != null ? String(installationTypeId) : "");
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
    const seen = new Set<number>();
    for (const r of rows) {
      const cid = toNumberOrNull(r.child_item);
      const q = toNumberOrNull(r.quantity);
      if (r.child_item.trim() === "") continue;
      if (cid == null || q == null || q <= 0) return null;
      if (seen.has(cid)) return null;
      seen.add(cid);
      out.push({ child_item: cid, quantity: q });
    }
    return out.length > 0 ? out : null;
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
    if (!comps) {
      toastError(tModal("duplicateComponentError"));
      return;
    }

    const installationTypePayload = installationTypeIdPayload(installationType);

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
              ...installationTypePayload,
            })
          : await createCompositeItem({
              name: name.trim(),
              sku: sku.trim(),
              quantity: qtyN,
              cost_price: costN,
              selling_price: sellN,
              components: comps,
              ...installationTypePayload,
            });
      toastSuccess(isEdit ? tModal("updatedToast") : tModal("createdToast"));
      if (!isEdit) clearQuickCreateFormDraft(draftReturnTo);
      const crossBack = sanitizeInternalDashboardBack(searchParams.get("back"));
      if (!isEdit && crossBack) {
        router.replace(buildQuickCreateReturnHref(crossBack, saved.id, "composite-item"));
      } else {
        router.replace(`${safeBack}?highlight=${saved.id}`);
      }
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
            <AppButton type="button" variant="secondary" size="sm" disabled={submitting} onClick={() => router.push(safeBack ?? routes.dashboard.compositeItems)}>
              {tModal("cancel")}
            </AppButton>
            <AppButton type="submit" form="composite-item-form-screen" variant="primary" size="sm" loading={submitting} disabled={noItems}>
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
            <div>
              <FieldLabel>{tModal("installationType")}</FieldLabel>
              {installationTypesError ? (
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{installationTypesError}</p>
              ) : null}
              <div className="mt-2">
                <CheckmarkSelect
                  listLabel={tModal("installationType")}
                  buttonAriaLabel={tModal("installationType")}
                  value={installationType}
                  onChange={setInstallationType}
                  options={installationTypeOptions}
                  emptyLabel={tModal("installationTypePlaceholder")}
                  disabled={submitting}
                  portaled
                  searchable
                  clearable
                  className="w-full max-w-md"
                />
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
                      <CheckmarkSelect
                        listLabel={tModal("childItem")}
                        buttonAriaLabel={tModal("childItem")}
                        value={r.child_item}
                        onChange={(v) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, child_item: v } : x)))}
                        options={itemOptionsForRow(r.id)}
                        emptyLabel={tModal("childItemPlaceholder")}
                        disabled={submitting || noItems}
                        portaled
                        searchable
                        className="w-full"
                        onAdd={
                          itemQuickCreate.onAdd
                            ? () => {
                                pendingItemRowRef.current = r.id;
                                itemQuickCreate.onAdd?.();
                              }
                            : undefined
                        }
                        addAriaLabel={itemQuickCreate.addAriaLabel}
                        addLabel={itemQuickCreate.addLabel}
                      />
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
