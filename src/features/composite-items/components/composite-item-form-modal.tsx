"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  createCompositeItem,
  updateCompositeItem,
} from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import { checkmarkOptionsExcludingUsed } from "@/shared/utils/checkmark-options-excluding.util";
import { cn } from "@/core/utils/http.util";
import type { ItemComponentRef } from "@/features/items/types/item.types";
import { fetchInstallationTypesPage } from "@/features/installation-types/api/installation-type.api";
import { getInstallationTypeId } from "@/features/items/utils/item-installation-type.util";
import { formatInstallationTypeLabel } from "@/features/installation-types/utils/installation-type-display.util";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  type CheckmarkSelectOption,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  FormSubsection,
  MoneyInput,
  NumericInput,
  surfaceInputClassName,
} from "@/shared/ui";
import { usePathname } from "@/i18n/navigation";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import {
  formatCompositePriceInput,
  sumCompositeComponentPrices,
} from "@/features/composite-items/utils/composite-component-prices.util";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  item: CompositeItem | null;
  onSaved: () => void;
};

type ComponentRow = { id: string; dbId?: number; child_item: string; quantity: string };

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

export function CompositeItemFormModal({ open, onClose, mode, item, onSaved }: Props) {
  const t = useTranslations("Dashboard.compositeItems.modal");
  const router = useRouter();
  const pathname = usePathname();
  const pendingItemRowRef = React.useRef<string | null>(null);

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
  const costManualRef = React.useRef(mode === "edit");
  const sellManualRef = React.useRef(mode === "edit");
  const [rows, setRows] = React.useState<ComponentRow[]>(() => {
    const comps = mode === "edit" && item?.components ? item.components : [];
    if (!comps || comps.length === 0) return [{ id: nextRowId(), child_item: "", quantity: "1" }];
    return comps.map((c) => ({ id: nextRowId(), dbId: c.id, child_item: String(c.child_item), quantity: String(c.quantity) }));
  });
  const [deletedComponents, setDeletedComponents] = React.useState<
    { id: number; child_item: number; quantity: number; is_deleted: true }[]
  >([]);
  const initialValuesRef = React.useRef<{
    name: string;
    sku: string;
    quantity: number;
    cost_price: number;
    selling_price: number;
    installation_type: number | null;
    components: { id?: number; child_item: number; quantity: number }[];
  } | null>(null);

  const [installationType, setInstallationType] = React.useState(() => {
    if (mode !== "edit" || !item) return "";
    const id = getInstallationTypeId(item.installation_type);
    return id != null ? String(id) : "";
  });
  const [installationTypeOptions, setInstallationTypeOptions] = React.useState<CheckmarkSelectOption[]>([]);
  const [installationTypesError, setInstallationTypesError] = React.useState<string | null>(null);
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

  const itemQuickCreate = useQuickCreate({
    kind: "item",
    returnTo: pathname,
    getFormDraft:
      open && mode === "create"
        ? () => ({ name, sku, qty, cost, sell, installationType, rows })
        : undefined,
  });

  const updateRowChildItem = React.useCallback((rowId: string, value: string) => {
    setRows((prev) => {
      return prev.map((x) => {
        if (x.id !== rowId) return x;

        const oldChildItemId = toNumberOrNull(x.child_item);
        if (x.dbId && oldChildItemId != null) {
          setDeletedComponents((del) => {
            if (del.some((d) => d.id === x.dbId)) return del;
            return [
              ...del,
              {
                id: x.dbId!,
                child_item: oldChildItemId,
                quantity: toNumberOrNull(x.quantity) ?? 1,
                is_deleted: true,
              },
            ];
          });
        }

        const newChildItemId = toNumberOrNull(value);
        let newDbId: number | undefined = undefined;
        if (newChildItemId != null) {
          const initialMatch = initialValuesRef.current?.components.find(
            (c) => c.child_item === newChildItemId,
          );
          if (initialMatch) {
            newDbId = initialMatch.id;
            setDeletedComponents((del) => del.filter((d) => d.id !== initialMatch.id));
          }
        }

        return { ...x, child_item: value, dbId: newDbId };
      });
    });
  }, []);

  const removeRow = React.useCallback((rowId: string) => {
    setRows((prev) => {
      const rowToRemove = prev.find((r) => r.id === rowId);
      if (rowToRemove && rowToRemove.dbId) {
        const cid = toNumberOrNull(rowToRemove.child_item);
        const q = toNumberOrNull(rowToRemove.quantity) ?? 1;
        if (cid != null) {
          setDeletedComponents((del) => {
            if (del.some((d) => d.id === rowToRemove.dbId)) return del;
            return [
              ...del,
              {
                id: rowToRemove.dbId!,
                child_item: cid,
                quantity: q,
                is_deleted: true,
              },
            ];
          });
        }
      }
      return normalizeRows(prev.filter((x) => x.id !== rowId));
    });
  }, []);

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
    if (!open) return;
    if (mode === "edit" && item) {
      setName(item.name ?? "");
      setSku(String(item.sku ?? ""));
      setQty(String(item.quantity ?? 0));
      setCost(String(item.cost_price ?? 0));
      setSell(String(item.selling_price ?? 0));
      costManualRef.current = true;
      sellManualRef.current = true;
      const installationTypeId = getInstallationTypeId(item.installation_type);
      setInstallationType(installationTypeId != null ? String(installationTypeId) : "");
      const comps = item.components ?? [];
      setRows(
        comps.length > 0
          ? comps.map((c) => ({
              id: nextRowId(),
              dbId: c.id,
              child_item: String(c.child_item),
              quantity: String(c.quantity),
            }))
          : [{ id: nextRowId(), child_item: "", quantity: "1" }],
      );
      setDeletedComponents([]);
      initialValuesRef.current = {
        name: item.name ?? "",
        sku: String(item.sku ?? ""),
        quantity: Number(item.quantity ?? 0),
        cost_price: Number(item.cost_price ?? 0),
        selling_price: Number(item.selling_price ?? 0),
        installation_type: installationTypeId != null ? installationTypeId : null,
        components: comps.map((c) => ({
          id: c.id,
          child_item: Number(c.child_item),
          quantity: Number(c.quantity),
        })),
      };
    } else {
      setName("");
      setSku("");
      setQty("0");
      setCost("0");
      setSell("0");
      costManualRef.current = false;
      sellManualRef.current = false;
      setInstallationType("");
      setRows([{ id: nextRowId(), child_item: "", quantity: "1" }]);
      setDeletedComponents([]);
      initialValuesRef.current = null;
    }
    setNameTouched(false);
    setSkuTouched(false);
  }, [open, mode, item]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open) return;
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
          setItemsError(t("itemsLoadError"));
          setInstallationTypesError(t("installationTypesLoadError"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  React.useEffect(() => {
    if (!open) return;
    if (costManualRef.current && sellManualRef.current) return;
    const totals = sumCompositeComponentPrices(rows, itemOptions);
    if (!costManualRef.current) setCost(formatCompositePriceInput(totals.cost));
    if (!sellManualRef.current) setSell(formatCompositePriceInput(totals.sell));
  }, [open, rows, itemOptions]);

  function normalizeRows(next: ComponentRow[]): ComponentRow[] {
    if (next.length === 0) return [{ id: nextRowId(), child_item: "", quantity: "1" }];
    return next;
  }

  function areComponentsEqual(
    initial: { id?: number; child_item: number; quantity: number }[],
    currentActive: (ItemComponentRef & { id?: number })[],
    deleted: { id?: number; child_item: number; quantity: number; is_deleted?: boolean }[]
  ): boolean {
    if (deleted.length > 0) return false;
    if (initial.length !== currentActive.length) return false;
    for (const c of currentActive) {
      const initMatch = initial.find((i) => i.child_item === c.child_item);
      if (!initMatch) return false;
      if (initMatch.quantity !== c.quantity) return false;
    }
    return true;
  }

  function buildComponents(): (ItemComponentRef & { id?: number })[] | null {
    const out: (ItemComponentRef & { id?: number })[] = [];
    const seen = new Set<number>();
    for (const r of rows) {
      const cid = toNumberOrNull(r.child_item);
      const q = toNumberOrNull(r.quantity);
      if (r.child_item.trim() === "") continue;
      if (cid == null || q == null || q <= 0) return null;
      if (seen.has(cid)) return null;
      seen.add(cid);
      const compObj: any = { child_item: cid, quantity: q };
      if (r.dbId != null) {
        compObj.id = r.dbId;
      }
      out.push(compObj);
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
    if (!comps) {
      toastError(t("duplicateComponentError"));
      return;
    }

    const installationTypePayload = installationTypeIdPayload(installationType);

    setSubmitting(true);
    try {
      if (mode === "edit" && item) {
        if (!initialValuesRef.current) {
          throw new Error("Initial values not loaded");
        }
        const init = initialValuesRef.current;
        const payload: any = {};
        if (name.trim() !== init.name) payload.name = name.trim();
        if (sku.trim() !== init.sku) payload.sku = sku.trim();
        if (qtyN !== init.quantity) payload.quantity = qtyN;
        if (costN !== init.cost_price) payload.cost_price = costN;
        if (sellN !== init.selling_price) payload.selling_price = sellN;

        const currentInstType = toNumberOrNull(installationType);
        if (currentInstType !== init.installation_type) {
          payload.installation_type = currentInstType;
        }

        const compsEqual = areComponentsEqual(init.components, comps, deletedComponents);
        if (!compsEqual) {
          payload.components = [...comps, ...deletedComponents];
        }

        if (Object.keys(payload).length === 0) {
          toastSuccess(t("updatedToast"));
          onSaved();
          onClose();
          router.push(buildEntityDetailHrefAfterSave(routes.dashboard.compositeItems, item.id, routes.dashboard.compositeItems));
          return;
        }

        await updateCompositeItem(item.id, payload);
        toastSuccess(t("updatedToast"));
        onSaved();
        onClose();
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.compositeItems, item.id, routes.dashboard.compositeItems));
      } else {
        const created = await createCompositeItem({
          name: name.trim(),
          sku: sku.trim(),
          quantity: qtyN,
          cost_price: costN,
          selling_price: sellN,
          components: comps,
          ...installationTypePayload,
        });
        toastSuccess(t("createdToast"));
        onSaved();
        onClose();
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.compositeItems, created.id, routes.dashboard.compositeItems));
      }
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
          <AppButton type="button" variant="secondary" size="sm" disabled={submitting} onClick={handleCloseAttempt}>
            {t("cancel")}
          </AppButton>
          <AppButton
            type="submit"
            form="composite-item-form"
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={noItems}
          >
            {mode === "edit" ? t("saveChanges") : t("save")}
          </AppButton>
        </>
      }
    >
      <form id="composite-item-form" className="space-y-5" onSubmit={(e) => void submit(e)}>
        <FormFieldRow cols="2" from="md" className="gap-4">
          <FieldGroup label={t("name")} htmlFor={nameId} required>
            <input
              id={nameId}
              type="text"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(sanitizeTitleInput(e.target.value))}
              onBlur={() => setNameTouched(true)}
              disabled={submitting}
              placeholder={t("namePlaceholder")}
              className={surfaceInputClassName}
            />
            {nameInvalid ? <FieldErrorText>{t("nameError")}</FieldErrorText> : null}
          </FieldGroup>

          <FieldGroup label={t("sku")} htmlFor={skuId} required>
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
            {skuInvalid ? <FieldErrorText>{t("skuError")}</FieldErrorText> : null}
          </FieldGroup>
        </FormFieldRow>

        <FormFieldRow cols="2" from="md" className="gap-4">
          <FieldGroup label={t("quantity")} htmlFor={qtyId} required>
            <NumericInput
              id={qtyId}
              integer
              value={qty}
              onChange={setQty}
              disabled={submitting}
            />
          </FieldGroup>
          <FieldGroup label={t("installationType")}>
            {installationTypesError ? (
              <p className="mb-1.5 text-sm text-amber-700 dark:text-amber-300">{installationTypesError}</p>
            ) : null}
            <CheckmarkSelect
              listLabel={t("installationType")}
              buttonAriaLabel={t("installationType")}
              value={installationType}
              onChange={setInstallationType}
              options={installationTypeOptions}
              emptyLabel={t("installationTypePlaceholder")}
              disabled={submitting}
              portaled
              searchable
              clearable
              className="w-full"
            />
          </FieldGroup>
        </FormFieldRow>

        <FormSubsection title={t("components")}>
          {itemsError ? (
            <p className="mb-1.5 text-sm text-amber-700 dark:text-amber-300">{itemsError}</p>
          ) : null}
          <div className="space-y-2">
            {rows.map((r, idx) => (
              <div key={r.id} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-0 w-full sm:max-w-[22rem] sm:flex-1">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("childItem")}
                    <span className="ml-1 text-red-500">*</span>
                  </span>
                  <CheckmarkSelect
                    listLabel={t("childItem")}
                    buttonAriaLabel={t("childItem")}
                    value={r.child_item}
                    onChange={(v) => {
                      updateRowChildItem(r.id, v);
                    }}
                    options={itemOptionsForRow(r.id)}
                    emptyLabel={t("childItemPlaceholder")}
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
                <div className="w-[5.5rem] shrink-0">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("componentQuantity")}
                  </span>
                  <NumericInput
                    integer
                    value={r.quantity}
                    onChange={(v) => {
                      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, quantity: v } : x)));
                    }}
                    disabled={submitting}
                  />
                </div>
                <div className="flex shrink-0 gap-2 pb-px">
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeRow(r.id)}
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
          {componentsInvalid ? <FieldErrorText>{t("atLeastOneComponentError")}</FieldErrorText> : null}
        </FormSubsection>

        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {t("pricesFromComponentsHint")}
          </p>
          <FormFieldRow cols="2" from="md" className="gap-4">
            <FieldGroup label={t("costPrice")} htmlFor={costId} required>
              <MoneyInput
                id={costId}
                type="number"
                inputMode="decimal"
                value={cost}
                onChange={(e) => {
                  costManualRef.current = true;
                  setCost(e.target.value);
                }}
                disabled={submitting}
                min={0}
                step="0.01"
              />
            </FieldGroup>
            <FieldGroup label={t("sellingPrice")} htmlFor={sellId} required>
              <MoneyInput
                id={sellId}
                type="number"
                inputMode="decimal"
                value={sell}
                onChange={(e) => {
                  sellManualRef.current = true;
                  setSell(e.target.value);
                }}
                disabled={submitting}
                min={0}
                step="0.01"
              />
            </FieldGroup>
          </FormFieldRow>
        </div>
      </form>
    </AppModal>
  );
}
