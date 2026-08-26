"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/core/utils/http.util";
import { createItem, updateItem } from "@/features/items/api/item.api";
import { fetchUnitTypesPage } from "@/features/unit-types/api/unit-type.api";
import { formatUnitTypeShortLabel } from "@/features/unit-types/utils/unit-type-display.util";
import { getUnitTypeId, resolveDefaultUnitTypeSelectValue } from "@/features/items/utils/item-unit-type.util";
import { getItemDimensionUnit, parseDimensionsInput } from "@/features/items/utils/item-dimensions-input.util";
import type { DimensionUnit, Item, WeightUnit } from "@/features/items/types/item.types";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { getApiFieldErrorMap } from "@/shared/form/report-form-api-error.util";
import { markApiErrorToasted } from "@/core/errors/api-error-toast.util";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  DimensionsLwhInput,
  FieldErrorText,
  FieldGroup,
  InputWithEndSelect,
  MoneyInput,
  MultiCheckSelect,
  NumericInput,
  surfaceInputClassName,
} from "@/shared/ui";
import { getItemVendorIds, itemVendorFallbackLabels, vendorIdsPayload } from "@/features/items/utils/item-vendors.util";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";

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
  // If any is missing/invalid, send nothing.
  if (lengthN == null || widthN == null || heightN == null) return {};
  return { length: lengthN, width: widthN, height: heightN };
}

function weightPayload(valueRaw: string, unitRaw: WeightUnit): { weight?: number; weight_unit?: WeightUnit } {
  const value = numOrNull(valueRaw);
  if (value == null || value < 0) return {};
  return { weight: value, weight_unit: unitRaw };
}

export function ItemFormModal({ open, onClose, mode, item, onSaved }: Props) {
  const t = useTranslations("Dashboard.items.modal");
  const router = useRouter();

  const nameId = React.useId();
  const skuId = React.useId();
  const unitId = React.useId();
  const qtyId = React.useId();
  const costId = React.useId();
  const sellId = React.useId();

  const [name, setName] = React.useState(() => (mode === "edit" && item ? item.name : ""));
  const [sku, setSku] = React.useState(() => (mode === "edit" && item ? String(item.sku ?? "") : ""));
  const [qty, setQty] = React.useState(() => (mode === "edit" && item ? String(item.quantity ?? 0) : ""));
  const [cost, setCost] = React.useState(() => (mode === "edit" && item ? String(item.cost_price ?? 0) : ""));
  const [sell, setSell] = React.useState(() => (mode === "edit" && item ? String(item.selling_price ?? 0) : ""));

  const [unitType, setUnitType] = React.useState(() => (mode === "edit" && item ? String(getUnitTypeId(item.unit_type) ?? "") : ""));
  const [unitTypeOptions, setUnitTypeOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [unitTypesError, setUnitTypesError] = React.useState<string | null>(null);

  const [length, setLength] = React.useState(() =>
    mode === "edit" && item ? (item.length != null ? String(item.length) : "") : "",
  );
  const [width, setWidth] = React.useState(() =>
    mode === "edit" && item ? (item.width != null ? String(item.width) : "") : "",
  );
  const [height, setHeight] = React.useState(() =>
    mode === "edit" && item ? (item.height != null ? String(item.height) : "") : "",
  );
  const [dimensionsUnit, setDimensionsUnit] = React.useState<DimensionUnit>(() =>
    mode === "edit" && item ? getItemDimensionUnit(item) : "cm",
  );
  const [weight, setWeight] = React.useState(() => (mode === "edit" && item ? (item.weight != null ? String(item.weight) : "") : ""));
  const [weightUnit, setWeightUnit] = React.useState<WeightUnit>(() =>
    mode === "edit" && item && (item.weight_unit === "g" || item.weight_unit === "lb")
      ? (item.weight_unit as WeightUnit)
      : "kg",
  );
  const [vendorIds, setVendorIds] = React.useState<string[]>(() =>
    mode === "edit" && item ? getItemVendorIds(item).map(String) : [],
  );
  const [vendorOptions, setVendorOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [vendorFallbackLabels, setVendorFallbackLabels] = React.useState<Record<string, string>>({});
  const [vendorsError, setVendorsError] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState<{ name?: boolean; sku?: boolean }>({});
  const [serverErrors, setServerErrors] = React.useState<{ name?: string; sku?: string }>({});

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && item) {
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
      setWeightUnit(item.weight_unit === "g" || item.weight_unit === "lb" ? (item.weight_unit as WeightUnit) : "kg");
      setVendorIds(getItemVendorIds(item).map(String));
      setVendorFallbackLabels(itemVendorFallbackLabels(item));
    } else {
      setName("");
      setSku("");
      setQty("");
      setCost("");
      setSell("");
      setUnitType("");
      setLength("");
      setWidth("");
      setHeight("");
      setWeight("");
      setWeightUnit("kg");
      setVendorIds([]);
      setVendorFallbackLabels({});
    }
    setTouched({});
  }, [open, mode, item]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setUnitTypesError(null);
      try {
        const { items: next } = await fetchUnitTypesPage(1, 500, { is_active: true });
        if (!cancelled) {
          const options = next.map((row) => ({
            value: String(row.id),
            label: formatUnitTypeShortLabel(row),
          }));
          setUnitTypeOptions(options);
          setUnitType((prev) => resolveDefaultUnitTypeSelectValue(prev, options));
        }
      } catch {
        if (!cancelled) setUnitTypesError(t("unitTypesLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setVendorsError(null);
      try {
        const { items } = await fetchVendorsPage(1, 500, { is_active: true });
        if (!cancelled) {
          setVendorOptions(items.map((v) => ({ value: String(v.id), label: v.name })));
        }
      } catch {
        if (!cancelled) setVendorsError(t("vendorsLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  const nameInvalid = Boolean(touched.name) && name.trim().length === 0;
  const skuInvalid = Boolean(touched.sku) && sku.trim().length === 0;
  const nameError = nameInvalid ? t("nameError") : serverErrors.name;
  const skuError = skuInvalid ? t("skuError") : serverErrors.sku;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, sku: true });
    setServerErrors({});

    const nameTrim = name.trim();
    const skuTrim = sku.trim();
    if (!nameTrim || !skuTrim) return;

    const qtyN = numOrNull(qty) ?? 0;
    const costN = numOrNull(cost) ?? 0;
    const sellN = numOrNull(sell) ?? 0;
    if (qtyN < 0 || costN < 0 || sellN < 0) return;

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

    setSubmitting(true);
    try {
      if (mode === "edit" && item) {
        await updateItem(item.id, {
          name: nameTrim,
          sku: skuTrim,
          quantity: qtyN,
          cost_price: costN,
          selling_price: sellN,
          ...unitTypePayload,
          ...dimensionsUnitPayload,
          ...weightFields,
          ...vendorsPayload,
        });
        toastSuccess(t("updatedToast"));
        onSaved();
        onClose();
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.items, item.id, routes.dashboard.items));
      } else {
        const created = await createItem({
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
        toastSuccess(t("createdToast"));
        onSaved();
        onClose();
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.items, created.id, routes.dashboard.items));
      }
    } catch (error) {
      const fieldErrors = getApiFieldErrorMap(error);
      if (fieldErrors.name || fieldErrors.sku) {
        setServerErrors({ name: fieldErrors.name, sku: fieldErrors.sku });
        markApiErrorToasted(error);
      } else {
        toastApiError(error);
      }
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
          <AppButton type="button" variant="secondary" size="sm" disabled={submitting} onClick={onClose}>
            {t("cancel")}
          </AppButton>
          <AppButton type="submit" form="item-form" variant="primary" size="sm" loading={submitting}>
            {mode === "edit" ? t("saveChanges") : t("save")}
          </AppButton>
        </>
      }
    >
      <form id="item-form" className="space-y-5" onSubmit={(e) => void submit(e)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup label={t("name")} htmlFor={nameId} required>
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
              placeholder={t("namePlaceholder")}
              className={cn(surfaceInputClassName, nameError && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
            />
            <FieldErrorText>{nameError}</FieldErrorText>
          </FieldGroup>

          <FieldGroup label={t("sku")} htmlFor={skuId} required>
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
              placeholder={t("skuPlaceholder")}
              className={cn(surfaceInputClassName, skuError && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
            />
            <FieldErrorText>{skuError}</FieldErrorText>
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FieldGroup label={t("unitType")} htmlFor={unitId}>
            <CheckmarkSelect
              id={unitId}
              listLabel={t("unitType")}
              buttonAriaLabel={t("unitType")}
              options={unitTypeOptions}
              value={unitType}
              emptyLabel={t("unitTypePlaceholder")}
              disabled={submitting || unitTypeOptions.length === 0}
              portaled
              searchable
              clearable
              className="w-full"
              onChange={setUnitType}
            />
            {unitTypesError ? <p className="mt-1.5 text-sm text-amber-700 dark:text-amber-300">{unitTypesError}</p> : null}
          </FieldGroup>
          <FieldGroup label={t("quantity")} htmlFor={qtyId}>
            <NumericInput
              id={qtyId}
              integer
              value={qty}
              onChange={setQty}
              disabled={submitting}
            />
          </FieldGroup>
          <FieldGroup label={t("costPrice")} htmlFor={costId} required>
            <MoneyInput
              id={costId}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              disabled={submitting}
            />
          </FieldGroup>
          <FieldGroup label={t("sellingPrice")} htmlFor={sellId} required>
            <MoneyInput
              id={sellId}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={sell}
              onChange={(e) => setSell(e.target.value)}
              disabled={submitting}
            />
          </FieldGroup>
        </div>

        <FieldGroup label={t("vendors")} htmlFor="modal-item-vendors">
          <MultiCheckSelect
            id="modal-item-vendors"
            options={vendorOptions}
            values={vendorIds}
            onChange={setVendorIds}
            disabled={submitting}
            placeholder={t("vendorsPlaceholder")}
            listLabel={t("vendors")}
            searchable
            fallbackLabels={vendorFallbackLabels}
          />
          {vendorsError ? (
            <p className="mt-1.5 text-sm text-amber-700 dark:text-amber-300">{vendorsError}</p>
          ) : null}
        </FieldGroup>

        <div className="space-y-4 pt-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("fulfilmentDetails")}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
            <FieldGroup label={t("dimensions")} htmlFor="modal-item-dimensions">
              <DimensionsLwhInput
                id="modal-item-dimensions"
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
                unitAriaLabel={t("dimensionsUnit")}
                lengthAriaLabel={t("dimensionsLength")}
                widthAriaLabel={t("dimensionsWidth")}
                heightAriaLabel={t("dimensionsHeight")}
                disabled={submitting}
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t("dimensionsHint")}</p>
            </FieldGroup>
            <FieldGroup label={t("weight")} htmlFor="modal-item-weight">
              <InputWithEndSelect
                inputId="modal-item-weight"
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
                selectAriaLabel={t("weightUnit")}
              />
            </FieldGroup>
          </div>
        </div>
      </form>
    </AppModal>
  );
}

