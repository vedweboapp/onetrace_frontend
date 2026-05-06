"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";
import { createItem, updateItem } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal, FieldLabel, fieldErrorTextClassName, surfaceInputClassName } from "@/shared/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  item: Item | null;
  onSaved: () => void;
};

function numOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function ItemFormModal({ open, onClose, mode, item, onSaved }: Props) {
  const t = useTranslations("Dashboard.items.modal");

  const nameId = React.useId();
  const skuId = React.useId();
  const qtyId = React.useId();
  const costId = React.useId();
  const sellId = React.useId();

  const [name, setName] = React.useState(() => (mode === "edit" && item ? item.name : ""));
  const [sku, setSku] = React.useState(() => (mode === "edit" && item ? String(item.sku ?? "") : ""));
  const [qty, setQty] = React.useState(() => (mode === "edit" && item ? String(item.quantity ?? 0) : ""));
  const [cost, setCost] = React.useState(() => (mode === "edit" && item ? String(item.cost_price ?? 0) : ""));
  const [sell, setSell] = React.useState(() => (mode === "edit" && item ? String(item.selling_price ?? 0) : ""));

  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState<{ name?: boolean; sku?: boolean }>({});

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && item) {
      setName(item.name);
      setSku(String(item.sku ?? ""));
      setQty(String(item.quantity ?? 0));
      setCost(String(item.cost_price ?? 0));
      setSell(String(item.selling_price ?? 0));
    } else {
      setName("");
      setSku("");
      setQty("");
      setCost("");
      setSell("");
    }
    setTouched({});
  }, [open, mode, item]);

  const nameInvalid = Boolean(touched.name) && name.trim().length === 0;
  const skuInvalid = Boolean(touched.sku) && sku.trim().length === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, sku: true });

    const nameTrim = name.trim();
    const skuTrim = sku.trim();
    if (!nameTrim || !skuTrim) return;

    const qtyN = numOrNull(qty) ?? 0;
    const costN = numOrNull(cost) ?? 0;
    const sellN = numOrNull(sell) ?? 0;
    if (qtyN < 0 || costN < 0 || sellN < 0) return;

    setSubmitting(true);
    try {
      if (mode === "edit" && item) {
        await updateItem(item.id, {
          name: nameTrim,
          sku: skuTrim,
          quantity: qtyN,
          cost_price: costN,
          selling_price: sellN,
        });
        toastSuccess(t("updatedToast"));
      } else {
        await createItem({
          name: nameTrim,
          sku: skuTrim,
          is_composite: false,
          quantity: qtyN,
          cost_price: costN,
          selling_price: sellN,
        });
        toastSuccess(t("createdToast"));
      }
      onSaved();
      onClose();
    } catch {
      /* axios interceptor snackbar */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal
      open={open}
      onClose={() => (!submitting ? onClose() : undefined)}
      title={mode === "edit" ? t("editTitle") : t("createTitle")}
      size="lg"
      showCloseButton
      closeOnBackdrop={!submitting}
      isBusy={submitting}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="md" disabled={submitting} onClick={onClose}>
            {t("cancel")}
          </AppButton>
          <AppButton type="submit" form="item-form" variant="primary" size="md" loading={submitting}>
            {mode === "edit" ? t("saveChanges") : t("save")}
          </AppButton>
        </>
      }
    >
      <form id="item-form" className="space-y-5" onSubmit={(e) => void submit(e)}>
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
            onBlur={() => setTouched((p) => ({ ...p, name: true }))}
            disabled={submitting}
            placeholder={t("namePlaceholder")}
            className={cn(surfaceInputClassName, nameInvalid && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
          />
          {nameInvalid ? <p className={fieldErrorTextClassName}>{t("nameError")}</p> : null}
        </div>

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
            onBlur={() => setTouched((p) => ({ ...p, sku: true }))}
            disabled={submitting}
            placeholder={t("skuPlaceholder")}
            className={cn(surfaceInputClassName, skuInvalid && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
          />
          {skuInvalid ? <p className={fieldErrorTextClassName}>{t("skuError")}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel htmlFor={qtyId}>{t("quantity")}</FieldLabel>
            <input
              id={qtyId}
              type="number"
              inputMode="numeric"
              min={0}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              disabled={submitting}
              className={surfaceInputClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor={costId}>{t("costPrice")}</FieldLabel>
            <input
              id={costId}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              disabled={submitting}
              className={surfaceInputClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor={sellId}>{t("sellingPrice")}</FieldLabel>
            <input
              id={sellId}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={sell}
              onChange={(e) => setSell(e.target.value)}
              disabled={submitting}
              className={surfaceInputClassName}
            />
          </div>
        </div>
      </form>
    </AppModal>
  );
}

