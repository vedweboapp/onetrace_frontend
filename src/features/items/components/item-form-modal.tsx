"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/core/utils/http.util";
import { createItem, updateItem } from "@/features/items/api/item.api";
import { fetchUnitTypesPage } from "@/features/unit-types/api/unit-type.api";
import { formatUnitTypeShortLabel } from "@/features/unit-types/utils/unit-type-display.util";
import { getUnitTypeId } from "@/features/items/utils/item-unit-type.util";
import type { DimensionUnit, Item, ItemAttachment, WeightUnit } from "@/features/items/types/item.types";
import type { ItemAttachmentWriteRef } from "@/features/items/utils/item-write-form-data.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { AppButton, AppModal, FieldLabel, fieldErrorTextClassName, InputWithEndSelect, surfaceInputClassName } from "@/shared/ui";

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

type AttachmentDraft = {
  key: string;
  id?: number;
  file?: File;
  file_name?: string;
  file_url?: string;
  removed?: boolean;
};

function nextAttachmentKey(): string {
  return `att-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function attachmentLabel(draft: AttachmentDraft): string {
  if (draft.file?.name) return draft.file.name;
  if (draft.file_name?.trim()) return draft.file_name.trim();
  return draft.file_url?.trim() || `Attachment #${draft.id ?? "?"}`;
}

function attachmentUrl(draft: AttachmentDraft): string | null {
  const raw = draft.file_url?.trim();
  return raw || null;
}

function mapApiAttachments(rows: ItemAttachment[] | null | undefined): AttachmentDraft[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && (row.id != null || row.file_name || row.file_url || (row as any).attachment || (row as any).url))
    .map((row) => ({
      key: nextAttachmentKey(),
      id: row.id,
      file_name: row.file_name ?? undefined,
      file_url: row.file_url ?? (row as any).attachment ?? (row as any).url ?? undefined,
    }));
}

function buildAttachmentRefs(drafts: AttachmentDraft[]): ItemAttachmentWriteRef[] {
  const out: ItemAttachmentWriteRef[] = [];
  for (const draft of drafts) {
    if (draft.removed && draft.id != null) {
      out.push({ id: draft.id, is_deleted: true });
    } else if (draft.file) {
      out.push({ file: draft.file });
    }
  }
  return out;
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

function parseDimensionsInput(raw: string): { length: string; width: string; height: string } {
  // Accept formats like: `22*22*22`, `22 x 22 x 22`, `22X 22 * 22`
  const parts = raw
    .split(/[xX*]/g)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3) return { length: "", width: "", height: "" };
  return { length: parts[0], width: parts[1], height: parts[2] };
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
  const [dimensionsInput, setDimensionsInput] = React.useState(() =>
    mode === "edit" && item
      ? item.length != null && item.width != null && item.height != null
        ? `${item.length}*${item.width}*${item.height}`
        : typeof item.dimensions === "string"
          ? item.dimensions
          : ""
      : "",
  );
  const [dimensionsUnit, setDimensionsUnit] = React.useState<DimensionUnit>(() =>
    mode === "edit" && item
      ? item.dimensions_unit === "cm" || item.dimensions_unit === "mm" || item.dimensions_unit === "m" || item.dimensions_unit === "in" || item.dimensions_unit === "ft"
        ? (item.dimensions_unit as DimensionUnit)
        : "cm"
      : "cm",
  );
  const [weight, setWeight] = React.useState(() => (mode === "edit" && item ? (item.weight != null ? String(item.weight) : "") : ""));
  const [weightUnit, setWeightUnit] = React.useState<WeightUnit>(() =>
    mode === "edit" && item && (item.weight_unit === "g" || item.weight_unit === "lb")
      ? (item.weight_unit as WeightUnit)
      : "kg",
  );

  const [attachmentDrafts, setAttachmentDrafts] = React.useState<AttachmentDraft[]>([]);
  const initialAttachmentDraftsRef = React.useRef<AttachmentDraft[]>([]);
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);

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
      const unitId = getUnitTypeId(item.unit_type);
      setUnitType(unitId != null ? String(unitId) : "");
      setLength(item.length != null && String(item.length).trim() !== "" ? String(item.length) : "");
      setWidth(item.width != null && String(item.width).trim() !== "" ? String(item.width) : "");
      setHeight(item.height != null && String(item.height).trim() !== "" ? String(item.height) : "");
      const dimUnit =
        item.dimensions_unit === "cm" || item.dimensions_unit === "mm" || item.dimensions_unit === "m"
          ? item.dimensions_unit
          : item.dimensions_unit === "in" || item.dimensions_unit === "ft"
            ? item.dimensions_unit
            : "cm";
      setDimensionsUnit(dimUnit);
      setDimensionsInput(
        item.length != null && item.width != null && item.height != null
          ? `${item.length}*${item.width}*${item.height}`
          : typeof item.dimensions === "string"
            ? item.dimensions
            : "",
      );
      setWeight(item.weight != null && String(item.weight).trim() !== "" ? String(item.weight) : "");
      setWeightUnit(item.weight_unit === "g" || item.weight_unit === "lb" ? (item.weight_unit as WeightUnit) : "kg");
      const attDrafts = mapApiAttachments(item.attachments);
      setAttachmentDrafts(attDrafts);
      initialAttachmentDraftsRef.current = attDrafts.map((d) => ({ ...d }));
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
      setAttachmentDrafts([]);
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
          setUnitTypeOptions(
            next.map((row) => ({
              value: String(row.id),
              label: formatUnitTypeShortLabel(row),
            })),
          );
        }
      } catch {
        if (!cancelled) setUnitTypesError(t("unitTypesLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, t]);

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

    const unitTypePayload = unitTypeIdPayload(unitType);
    const dimensionsFields = dimensionsPayload(length, width, height);
    const hasDimensions = Object.keys(dimensionsFields).length > 0;
    const dimensionsUnitPayload =
      dimensionsInput.trim().length === 0
        ? { length: null, width: null, height: null, dimensions_unit: null }
        : hasDimensions
          ? { ...dimensionsFields, dimensions_unit: dimensionsUnit }
          : {};
    const weightFields = weightPayload(weight, weightUnit);
    const attachmentRefs = buildAttachmentRefs(attachmentDrafts);

    setSubmitting(true);
    try {
      if (mode === "edit" && item) {
        await updateItem(
          item.id,
          {
            name: nameTrim,
            sku: skuTrim,
            quantity: qtyN,
            cost_price: costN,
            selling_price: sellN,
            ...unitTypePayload,
            ...dimensionsUnitPayload,
            ...weightFields,
          },
          { attachmentRefs },
        );
        toastSuccess(t("updatedToast"));
        onSaved();
        onClose();
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.items, item.id, routes.dashboard.items));
      } else {
        const created = await createItem(
          {
            name: nameTrim,
            sku: skuTrim,
            is_composite: false,
            quantity: qtyN,
            cost_price: costN,
            selling_price: sellN,
            ...unitTypePayload,
            ...dimensionsUnitPayload,
            ...weightFields,
          },
          { attachmentRefs },
        );
        toastSuccess(t("createdToast"));
        onSaved();
        onClose();
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.items, created.id, routes.dashboard.items));
      }
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
        <div>
          <FieldLabel htmlFor={nameId} required>
            {t("name")}
          </FieldLabel>
          <input
            id={nameId}
            type="text"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(capitalizeFirstLetter(e.target.value))}
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
            <InputWithEndSelect
              inputId={qtyId}
              inputType="number"
              inputMode="numeric"
              min={0}
              inputValue={qty}
              onInputChange={setQty}
              disabled={submitting}
              selectValue={unitType}
              onSelectChange={setUnitType}
              selectOptions={unitTypeOptions}
              selectAriaLabel={t("unitType")}
              selectPlaceholder={t("unitTypePlaceholder")}
              selectDisabled={unitTypeOptions.length === 0}
            />
            {unitTypesError ? <p className="mt-1.5 text-sm text-amber-700 dark:text-amber-300">{unitTypesError}</p> : null}
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

        <div className="space-y-4 pt-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("fulfilmentDetails")}</h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
            <div>
              <FieldLabel htmlFor="modal-item-dimensions">{t("dimensions")}</FieldLabel>
              <div className="mt-1.5">
                <InputWithEndSelect
                  inputId="modal-item-dimensions"
                  inputValue={dimensionsInput}
                  onInputChange={(v) => {
                    setDimensionsInput(v);
                    const parsed = parseDimensionsInput(v);
                    setLength(parsed.length);
                    setWidth(parsed.width);
                    setHeight(parsed.height);
                  }}
                  inputType="text"
                  disabled={submitting}
                  placeholder={t("dimensionsPlaceholder")}
                  selectValue={dimensionsUnit}
                  onSelectChange={(v) => setDimensionsUnit((v as DimensionUnit) || "cm")}
                  selectOptions={[
                    { value: "cm", label: "cm" },
                    { value: "mm", label: "mm" },
                    { value: "m", label: "m" },
                    { value: "in", label: "in" },
                    { value: "ft", label: "ft" },
                  ]}
                  selectAriaLabel={t("dimensionsUnit")}
                  selectDisabled={false}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t("dimensionsHint")}</p>
            </div>
            <div>
              <FieldLabel htmlFor="modal-item-weight">{t("weight")}</FieldLabel>
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
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <FieldLabel>{t("attachments")}</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              className="sr-only"
              disabled={submitting}
              onChange={(e) => {
                const files = e.target.files;
                if (!files?.length) return;
                const next = Array.from(files).map((file) => ({
                  key: nextAttachmentKey(),
                  file,
                  file_name: file.name,
                }));
                setAttachmentDrafts((prev) => [...prev, ...next]);
                e.currentTarget.value = "";
              }}
            />
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={submitting}
              onClick={() => attachmentInputRef.current?.click()}
            >
              {t("addAttachments")}
            </AppButton>
          </div>

          {(() => {
            const visible = attachmentDrafts.filter((d) => !d.removed);
            if (visible.length === 0) return null;
            return (
              <ul className="space-y-2">
                {visible.map((draft) => {
                  const href = attachmentUrl(draft);
                  return (
                    <li
                      key={draft.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm dark:border-slate-700"
                    >
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 truncate text-[color:var(--dash-accent,#111111)] underline-offset-2 hover:underline"
                        >
                          {attachmentLabel(draft)}
                        </a>
                      ) : (
                        <span className="min-w-0 truncate text-slate-800 dark:text-slate-100">{attachmentLabel(draft)}</span>
                      )}
                      <AppButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="!px-2"
                        disabled={submitting}
                        onClick={() => {
                          setAttachmentDrafts((prev) =>
                            prev
                              .map((d) => {
                                if (d.key !== draft.key) return d;
                                if (d.id != null) return { ...d, removed: true };
                                return null;
                              })
                              .filter((d): d is AttachmentDraft => d != null),
                          );
                        }}
                      >
                        {t("removeAttachment")}
                      </AppButton>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </div>
      </form>
    </AppModal>
  );
}

