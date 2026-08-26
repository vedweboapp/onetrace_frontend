"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { cn } from "@/core/utils/http.util";
import { createItem, fetchItem, updateItem } from "@/features/items/api/item.api";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { getApiFieldErrorMap } from "@/shared/form/report-form-api-error.util";
import { markApiErrorToasted } from "@/core/errors/api-error-toast.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { useQuickCreate, useSettingsQuickAdd } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import {
  hrefAfterEntityCreate,
  QUICK_CREATE_SELECT_TARGET_PARAM,
} from "@/shared/utils/quick-create-navigation.util";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import type { InputWithEndSelectOption } from "@/shared/ui";
import { AppButton, CheckmarkSelect, DimensionsLwhInput, FieldErrorText, FieldGroup, InputWithEndSelect, MoneyInput, MultiCheckSelect, NumericInput, SurfaceShell, surfaceInputClassName } from "@/shared/ui";
import { fetchUnitTypesPage } from "@/features/unit-types/api/unit-type.api";
import { formatUnitTypeShortLabel } from "@/features/unit-types/utils/unit-type-display.util";
import { getUnitTypeId, resolveDefaultUnitTypeSelectValue } from "@/features/items/utils/item-unit-type.util";
import { getItemDimensionUnit, parseDimensionsInput } from "@/features/items/utils/item-dimensions-input.util";
import { getItemVendorIds, itemVendorFallbackLabels, vendorIdsPayload } from "@/features/items/utils/item-vendors.util";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import type { DimensionUnit, WeightUnit } from "@/features/items/types/item.types";

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

function unitTypeIdPayload(unitTypeValue: string): { unit_type?: number } {
  const id = numOrNull(unitTypeValue);
  if (id == null || id <= 0) return {};
  return { unit_type: id };
}

function dimensionsPayload(
  lengthRaw: string,
  widthRaw: string,
  heightRaw: string,
): { length?: number; width?: number; height?: number } {
  const lengthN = numOrNull(lengthRaw);
  const widthN = numOrNull(widthRaw);
  const heightN = numOrNull(heightRaw);
  // Backend expects `length`, `width`, `height` together.
  if (lengthN == null || widthN == null || heightN == null) return {};
  return { length: lengthN, width: widthN, height: heightN };
}

function weightPayload(valueRaw: string, unitRaw: WeightUnit): { weight?: number; weight_unit?: WeightUnit } {
  const value = numOrNull(valueRaw);
  if (value == null || value < 0) return {};
  return { weight: value, weight_unit: unitRaw };
}

export function ItemFormScreen({ mode, itemId }: Props) {
  const t = useTranslations("Dashboard.items");
  const tModal = useTranslations("Dashboard.items.modal");
  const tQuick = useTranslations("Dashboard.quickCreate");
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = useFormBackUrl("items", routes.dashboard.items);
  const isEdit = mode === "edit";

  const unitTypeQuickAdd = useSettingsQuickAdd({
    href: routes.dashboard.settingsUnitTypes,
    addLabel: tQuick("add.unitType"),
  });

  const nameId = React.useId();
  const skuId = React.useId();
  const unitId = React.useId();
  const qtyId = React.useId();
  const costId = React.useId();
  const sellId = React.useId();

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [qty, setQty] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [sell, setSell] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState<{ name?: boolean; sku?: boolean; cost?: boolean; sell?: boolean }>({});
  const [serverErrors, setServerErrors] = React.useState<{ name?: string; sku?: string }>({});
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);

  const [unitType, setUnitType] = React.useState("");
  const [unitTypeOptions, setUnitTypeOptions] = React.useState<InputWithEndSelectOption[]>([]);
  const [unitTypesError, setUnitTypesError] = React.useState<string | null>(null);

  const [length, setLength] = React.useState("");
  const [width, setWidth] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [dimensionsUnit, setDimensionsUnit] = React.useState<DimensionUnit>("cm");
  const [weight, setWeight] = React.useState("");
  const [weightUnit, setWeightUnit] = React.useState<WeightUnit>("kg");
  const [vendorIds, setVendorIds] = React.useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [vendorFallbackLabels, setVendorFallbackLabels] = React.useState<Record<string, string>>({});
  const [vendorsError, setVendorsError] = React.useState<string | null>(null);

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
          const unitId = getUnitTypeId(item.unit_type);
          setUnitType(unitId != null ? String(unitId) : "");
          setLength(item.length != null && String(item.length).trim() !== "" ? String(item.length) : "");
          setWidth(item.width != null && String(item.width).trim() !== "" ? String(item.width) : "");
          setHeight(item.height != null && String(item.height).trim() !== "" ? String(item.height) : "");
          setDimensionsUnit(getItemDimensionUnit(item));
          if (
            (item.length == null || item.width == null || item.height == null) &&
            typeof item.dimensions === "string" &&
            item.dimensions.trim()
          ) {
            const parsed = parseDimensionsInput(item.dimensions);
            setLength(parsed.length);
            setWidth(parsed.width);
            setHeight(parsed.height);
          }
          setWeight(item.weight != null && String(item.weight).trim() !== "" ? String(item.weight) : "");
          setWeightUnit(
            item.weight_unit === "g" || item.weight_unit === "lb"
              ? item.weight_unit
              : "kg",
          );
          const loadedVendorIds = getItemVendorIds(item);
          setVendorIds(loadedVendorIds.map(String));
          setVendorFallbackLabels(itemVendorFallbackLabels(item));
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

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setUnitTypesError(null);
      try {
        const { items } = await fetchUnitTypesPage(1, 500, { is_active: true });
        if (!cancelled) {
          const options = items.map((row) => ({
            value: String(row.id),
            label: formatUnitTypeShortLabel(row),
          }));
          setUnitTypeOptions(options);
          setUnitType((prev) => resolveDefaultUnitTypeSelectValue(prev, options));
        }
      } catch {
        if (!cancelled) setUnitTypesError(tModal("unitTypesLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tModal]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setVendorsError(null);
      try {
        const { items } = await fetchVendorsPage(1, 500, { is_active: true });
        if (!cancelled) {
          setVendorOptions(items.map((v) => ({ value: String(v.id), label: v.name })));
        }
      } catch {
        if (!cancelled) setVendorsError(tModal("vendorsLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tModal]);

  const getFormDraft = React.useCallback(
    () => ({
      name,
      sku,
      qty,
      cost,
      sell,
      unitType,
      length,
      width,
      height,
      dimensionsUnit,
      weight,
      weightUnit,
      vendorIds,
    }),
    [name, sku, qty, cost, sell, unitType, length, width, height, dimensionsUnit, weight, weightUnit, vendorIds],
  );

  const restoreFormDraft = React.useCallback((draft: unknown) => {
    const saved = draft as Partial<{
      name: string;
      sku: string;
      qty: string;
      cost: string;
      sell: string;
      unitType: string;
      length: string;
      width: string;
      height: string;
      dimensionsUnit: DimensionUnit;
      weight: string;
      weightUnit: WeightUnit;
      vendorIds: string[];
    }>;
    if (typeof saved.name === "string") setName(saved.name);
    if (typeof saved.sku === "string") setSku(saved.sku);
    if (typeof saved.qty === "string") setQty(saved.qty);
    if (typeof saved.cost === "string") setCost(saved.cost);
    if (typeof saved.sell === "string") setSell(saved.sell);
    if (typeof saved.unitType === "string") setUnitType(saved.unitType);
    if (typeof saved.length === "string") setLength(saved.length);
    if (typeof saved.width === "string") setWidth(saved.width);
    if (typeof saved.height === "string") setHeight(saved.height);
    if (saved.dimensionsUnit === "cm" || saved.dimensionsUnit === "mm" || saved.dimensionsUnit === "m" || saved.dimensionsUnit === "in" || saved.dimensionsUnit === "ft") {
      setDimensionsUnit(saved.dimensionsUnit);
    }
    if (typeof saved.weight === "string") setWeight(saved.weight);
    if (saved.weightUnit === "kg" || saved.weightUnit === "g" || saved.weightUnit === "lb") {
      setWeightUnit(saved.weightUnit);
    }
    if (Array.isArray(saved.vendorIds)) setVendorIds(saved.vendorIds.map(String));
  }, []);

  const reloadVendors = React.useCallback(async () => {
    setVendorsError(null);
    try {
      const { items } = await fetchVendorsPage(1, 500, { is_active: true });
      setVendorOptions(items.map((v) => ({ value: String(v.id), label: v.name })));
    } catch {
      setVendorsError(tModal("vendorsLoadError"));
    }
  }, [tModal]);

  const vendorQuickCreate = useQuickCreate({
    kind: "vendor",
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });

  useQuickCreateReturn({
    restoreFormDraft: !isEdit ? restoreFormDraft : undefined,
    onReloadOptions: reloadVendors,
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget !== "vendor") return;
      setVendorIds((prev) => (prev.includes(selectId) ? prev : [...prev, selectId]));
    },
  });

  const nameInvalid = Boolean(touched.name) && name.trim().length === 0;
  const skuInvalid = Boolean(touched.sku) && sku.trim().length === 0;
  const costNPreview = numOrNull(cost);
  const sellNPreview = numOrNull(sell);
  const costInvalid = Boolean(touched.cost) && (costNPreview == null || costNPreview < 0);
  const sellInvalid = Boolean(touched.sell) && (sellNPreview == null || sellNPreview < 0);
  const nameError = nameInvalid ? tModal("nameError") : serverErrors.name;
  const skuError = skuInvalid ? tModal("skuError") : serverErrors.sku;
  const costError = costInvalid ? tModal("costPriceError") : undefined;
  const sellError = sellInvalid ? tModal("sellingPriceError") : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, sku: true, cost: true, sell: true });
    setServerErrors({});

    const nameTrim = name.trim();
    const skuTrim = sku.trim();
    if (!nameTrim || !skuTrim) return;

    const qtyN = numOrNull(qty) ?? 0;
    const costN = numOrNull(cost);
    const sellN = numOrNull(sell);
    if (costN == null || costN < 0 || sellN == null || sellN < 0) return;
    if (qtyN < 0) return;

    setSubmitting(true);
    try {
      const unitTypePayload = unitTypeIdPayload(unitType);
      const dimensionsFields = dimensionsPayload(length, width, height);
      const hasDimensions = Object.keys(dimensionsFields).length > 0;
      const dimensionsUnitPayload =
        !length.trim() && !width.trim() && !height.trim()
          ? { length: null, width: null, height: null, dimensions_unit: null }
          : hasDimensions
            ? { ...dimensionsFields, dimensions_unit: dimensionsUnit }
            : {};
      const weightFields = weightPayload(weight, weightUnit);
      const vendorsPayload = vendorIdsPayload(vendorIds);

      const saved =
        isEdit && itemId
          ? await updateItem(itemId, {
              name: nameTrim,
              sku: skuTrim,
              quantity: qtyN,
              cost_price: costN,
              selling_price: sellN,
              ...unitTypePayload,
              ...dimensionsUnitPayload,
              ...weightFields,
              ...vendorsPayload,
            })
          : await createItem({
              name: nameTrim,
              sku: skuTrim,
              is_composite: false,
              quantity: qtyN,
              cost_price: costN,
              selling_price: sellN,
              ...unitTypePayload,
              ...dimensionsUnitPayload,
              ...weightFields,
              ...vendorsPayload,
            });
      toastSuccess(isEdit ? tModal("updatedToast") : tModal("createdToast"));
      router.replace(
        hrefAfterEntityCreate({
          createdId: saved.id,
          selectTarget: isEdit ? null : searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM),
          backHref: safeBack,
          listPath: routes.dashboard.items,
        }),
      );
    } catch (error) {
      const fieldErrors = getApiFieldErrorMap(error);
      if (fieldErrors.name || fieldErrors.sku) {
        setServerErrors({ name: fieldErrors.name, sku: fieldErrors.sku });
        markApiErrorToasted(error);
      } else {
        toastApiError(error, t("loadError"));
      }
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
            <AppButton type="button" variant="secondary" size="sm" disabled={submitting} onClick={() => router.push(safeBack ?? routes.dashboard.items)}>
              {tModal("cancel")}
            </AppButton>
            <AppButton type="submit" form="item-form-screen" variant="primary" size="sm" loading={submitting}>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label={tModal("name")} htmlFor={nameId} required>
                <input
                  id={nameId}
                  type="text"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => {
                    setServerErrors((prev) => ({ ...prev, name: undefined }));
                    setName(sanitizeTitleInput(e.target.value));
                  }}
                  onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                  disabled={submitting}
                  placeholder={tModal("namePlaceholder")}
                  className={cn(surfaceInputClassName, nameError && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
                />
                <FieldErrorText>{nameError}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={tModal("sku")} htmlFor={skuId} required>
                <input
                  id={skuId}
                  type="text"
                  autoComplete="off"
                  value={sku}
                  onChange={(e) => {
                    setServerErrors((prev) => ({ ...prev, sku: undefined }));
                    setSku(e.target.value);
                  }}
                  onBlur={() => setTouched((p) => ({ ...p, sku: true }))}
                  disabled={submitting}
                  placeholder={tModal("skuPlaceholder")}
                  className={cn(surfaceInputClassName, skuError && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
                />
                <FieldErrorText>{skuError}</FieldErrorText>
              </FieldGroup>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label={tModal("unitType")} htmlFor={unitId}>
                <CheckmarkSelect
                  id={unitId}
                  listLabel={tModal("unitType")}
                  buttonAriaLabel={tModal("unitType")}
                  options={unitTypeOptions}
                  value={unitType}
                  emptyLabel={tModal("unitTypePlaceholder")}
                  disabled={submitting || unitTypeOptions.length === 0}
                  portaled
                  searchable
                  clearable
                  className="w-full"
                  onChange={setUnitType}
                  onAdd={unitTypeQuickAdd.onAdd}
                  addAriaLabel={unitTypeQuickAdd.addAriaLabel}
                  addLabel={unitTypeQuickAdd.addLabel}
                />
                {unitTypesError ? <p className="mt-1.5 text-sm text-amber-700 dark:text-amber-300">{unitTypesError}</p> : null}
              </FieldGroup>
              <FieldGroup label={tModal("quantity")} htmlFor={qtyId}>
                <NumericInput
                  id={qtyId}
                  integer
                  value={qty}
                  onChange={setQty}
                  disabled={submitting}
                />
              </FieldGroup>
              <FieldGroup label={tModal("costPrice")} htmlFor={costId} required>
                <MoneyInput
                  id={costId}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, cost: true }))}
                  disabled={submitting}
                  invalid={!!costError}
                />
                <FieldErrorText>{costError}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={tModal("sellingPrice")} htmlFor={sellId} required>
                <MoneyInput
                  id={sellId}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={sell}
                  onChange={(e) => setSell(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, sell: true }))}
                  disabled={submitting}
                  invalid={!!sellError}
                />
                <FieldErrorText>{sellError}</FieldErrorText>
              </FieldGroup>
            </div>

            <FieldGroup label={tModal("vendors")} htmlFor="item-vendors">
              <MultiCheckSelect
                id="item-vendors"
                options={vendorOptions}
                values={vendorIds}
                onChange={setVendorIds}
                disabled={submitting}
                placeholder={tModal("vendorsPlaceholder")}
                listLabel={tModal("vendors")}
                searchable
                fallbackLabels={vendorFallbackLabels}
                onAdd={vendorQuickCreate.onAdd}
                addAriaLabel={vendorQuickCreate.addAriaLabel}
                addLabel={vendorQuickCreate.addLabel}
              />
              {vendorsError ? (
                <p className="mt-1.5 text-sm text-amber-700 dark:text-amber-300">{vendorsError}</p>
              ) : null}
            </FieldGroup>

            <div
              className={cn(
                "grid w-full gap-x-[var(--form-label-gap,0.75rem)] gap-y-3 pt-1",
                "md:grid-cols-[var(--form-label-col,9.5rem)_minmax(0,1fr)]",
              )}
            >
              <h3 className="field-label text-sm font-semibold text-slate-900 dark:text-slate-100 md:pt-[calc((var(--form-control-height,2.75rem)-1.35em)/2)]">
                {tModal("fulfilmentDetails")}
              </h3>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                <FieldGroup label={tModal("dimensions")} htmlFor="item-dimensions">
                  <DimensionsLwhInput
                    id="item-dimensions"
                    length={length}
                    width={width}
                    height={height}
                    onChange={(next) => {
                      setLength(next.length);
                      setWidth(next.width);
                      setHeight(next.height);
                    }}
                    unit={dimensionsUnit}
                    onUnitChange={(v) => setDimensionsUnit((v as DimensionUnit) || "cm")}
                    unitAriaLabel={tModal("dimensionsUnit")}
                    lengthAriaLabel={tModal("dimensionsLength")}
                    widthAriaLabel={tModal("dimensionsWidth")}
                    heightAriaLabel={tModal("dimensionsHeight")}
                    disabled={submitting}
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{tModal("dimensionsHint")}</p>
                </FieldGroup>
                <FieldGroup label={tModal("weight")} htmlFor="item-weight">
                  <InputWithEndSelect
                    inputId="item-weight"
                    inputType="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    inputValue={weight}
                    onInputChange={setWeight}
                    disabled={submitting}
                    selectValue={weightUnit}
                    onSelectChange={(v) => setWeightUnit((v as WeightUnit) || "kg")}
                    selectOptions={[
                      { value: "kg", label: "kg" },
                      { value: "g", label: "g" },
                      { value: "lb", label: "lb" },
                    ]}
                    selectAriaLabel={tModal("weightUnit")}
                  />
                </FieldGroup>
              </div>
            </div>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
