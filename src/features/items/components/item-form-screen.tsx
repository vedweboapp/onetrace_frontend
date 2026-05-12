"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/core/utils/http.util";
import { createItem, fetchItem, updateItem } from "@/features/items/api/item.api";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { AppButton, FieldLabel, fieldErrorTextClassName, SurfaceShell, surfaceInputClassName } from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  itemId?: number;
};

function numOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function ItemFormScreen({ mode, itemId }: Props) {
  const t = useTranslations("Dashboard.items");
  const tModal = useTranslations("Dashboard.items.modal");
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "items");
  const isEdit = mode === "edit";

  const nameId = React.useId();
  const skuId = React.useId();
  const qtyId = React.useId();
  const costId = React.useId();
  const sellId = React.useId();

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [qty, setQty] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [sell, setSell] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState<{ name?: boolean; sku?: boolean }>({});
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isEdit || !itemId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const item = await fetchItem(itemId);
        if (!cancelled) {
          setName(item.name);
          setSku(String(item.sku ?? ""));
          setQty(String(item.quantity ?? 0));
          setCost(String(item.cost_price ?? 0));
          setSell(String(item.selling_price ?? 0));
          setTouched({});
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
      const saved =
        isEdit && itemId
          ? await updateItem(itemId, {
              name: nameTrim,
              sku: skuTrim,
              quantity: qtyN,
              cost_price: costN,
              selling_price: sellN,
            })
          : await createItem({
              name: nameTrim,
              sku: skuTrim,
              is_composite: false,
              quantity: qtyN,
              cost_price: costN,
              selling_price: sellN,
            });
      toastSuccess(isEdit ? tModal("updatedToast") : tModal("createdToast"));
      router.replace(`${safeBack}?highlight=${saved.id}`);
    } catch {
      toastError(t("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

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
            <AppButton type="submit" form="item-form-screen" variant="primary" size="md" loading={submitting}>
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
          <form id="item-form-screen" className="space-y-5 p-4 sm:p-6" onSubmit={(e) => void submit(e)}>
            <div>
              <FieldLabel htmlFor={nameId} required>
                {tModal("name")}
              </FieldLabel>
              <input
                id={nameId}
                type="text"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(capitalizeFirstLetter(e.target.value))}
                onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                disabled={submitting}
                placeholder={tModal("namePlaceholder")}
                className={cn(surfaceInputClassName, nameInvalid && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
              />
              {nameInvalid ? <p className={fieldErrorTextClassName}>{tModal("nameError")}</p> : null}
            </div>
            <div>
              <FieldLabel htmlFor={skuId} required>
                {tModal("sku")}
              </FieldLabel>
              <input
                id={skuId}
                type="text"
                autoComplete="off"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, sku: true }))}
                disabled={submitting}
                placeholder={tModal("skuPlaceholder")}
                className={cn(surfaceInputClassName, skuInvalid && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
              />
              {skuInvalid ? <p className={fieldErrorTextClassName}>{tModal("skuError")}</p> : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel htmlFor={qtyId}>{tModal("quantity")}</FieldLabel>
                <input id={qtyId} type="number" inputMode="numeric" min={0} value={qty} onChange={(e) => setQty(e.target.value)} disabled={submitting} className={surfaceInputClassName} />
              </div>
              <div>
                <FieldLabel htmlFor={costId}>{tModal("costPrice")}</FieldLabel>
                <input id={costId} type="number" inputMode="decimal" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} disabled={submitting} className={surfaceInputClassName} />
              </div>
              <div>
                <FieldLabel htmlFor={sellId}>{tModal("sellingPrice")}</FieldLabel>
                <input id={sellId} type="number" inputMode="decimal" min={0} step="0.01" value={sell} onChange={(e) => setSell(e.target.value)} disabled={submitting} className={surfaceInputClassName} />
              </div>
            </div>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
