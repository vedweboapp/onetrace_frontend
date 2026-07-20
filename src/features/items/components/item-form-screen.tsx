"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { cn } from "@/core/utils/http.util";
import { createItem, fetchItem, updateItem } from "@/features/items/api/item.api";
import { toastError, toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import {
  resolveFormBackUrl,
} from "@/shared/utils/quick-create-navigation.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import type { InputWithEndSelectOption } from "@/shared/ui";
import { AppButton, FieldLabel, fieldErrorTextClassName, InputWithEndSelect, SurfaceShell, surfaceInputClassName } from "@/shared/ui";
import { fetchUnitTypesPage } from "@/features/unit-types/api/unit-type.api";
import { formatUnitTypeShortLabel } from "@/features/unit-types/utils/unit-type-display.util";
import { getUnitTypeId } from "@/features/items/utils/item-unit-type.util";
import type { DimensionUnit, ItemAttachment, WeightUnit } from "@/features/items/types/item.types";
import type { ItemAttachmentWriteRef } from "@/features/items/utils/item-write-form-data.util";

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

export function ItemFormScreen({ mode, itemId }: Props) {
  const t = useTranslations("Dashboard.items");
  const tModal = useTranslations("Dashboard.items.modal");
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = useFormBackUrl("items", routes.dashboard.items);
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

  const [unitType, setUnitType] = React.useState("");
  const [unitTypeOptions, setUnitTypeOptions] = React.useState<InputWithEndSelectOption[]>([]);
  const [unitTypesError, setUnitTypesError] = React.useState<string | null>(null);

  const [length, setLength] = React.useState("");
  const [width, setWidth] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [dimensionsInput, setDimensionsInput] = React.useState("");
  const [dimensionsUnit, setDimensionsUnit] = React.useState<DimensionUnit>("cm");
  const [weight, setWeight] = React.useState("");
  const [weightUnit, setWeightUnit] = React.useState<WeightUnit>("kg");

  const [attachmentDrafts, setAttachmentDrafts] = React.useState<AttachmentDraft[]>([]);
  const initialAttachmentDraftsRef = React.useRef<AttachmentDraft[]>([]);
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);

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
          setWeightUnit(
            item.weight_unit === "g" || item.weight_unit === "lb"
              ? item.weight_unit
              : "kg",
          );
          const attDrafts = mapApiAttachments(item.attachments);
          setAttachmentDrafts(attDrafts);
          initialAttachmentDraftsRef.current = attDrafts.map((d) => ({ ...d }));
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
          setUnitTypeOptions(
            items.map((row) => ({
              value: String(row.id),
              label: formatUnitTypeShortLabel(row),
            })),
          );
        }
      } catch {
        if (!cancelled) setUnitTypesError(tModal("unitTypesLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tModal]);

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

      const saved =
        isEdit && itemId
          ? await updateItem(
              itemId,
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
            )
          : await createItem(
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
      toastSuccess(isEdit ? tModal("updatedToast") : tModal("createdToast"));
      router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.items, saved.id, safeBack));
    } catch (error) {
      toastApiError(error, t("loadError"));
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
                  selectAriaLabel={tModal("unitType")}
                  selectPlaceholder={tModal("unitTypePlaceholder")}
                  selectDisabled={unitTypeOptions.length === 0}
                />
                {unitTypesError ? <p className="mt-1.5 text-sm text-amber-700 dark:text-amber-300">{unitTypesError}</p> : null}
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

            <div className="space-y-4 pt-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tModal("fulfilmentDetails")}</h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
                <div>
                  <FieldLabel htmlFor="item-dimensions">{tModal("dimensions")}</FieldLabel>
                  <div className="mt-1.5">
                    <InputWithEndSelect
                      inputId="item-dimensions"
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
                      placeholder={tModal("dimensionsPlaceholder")}
                      selectValue={dimensionsUnit}
                      onSelectChange={(v) => setDimensionsUnit((v as DimensionUnit) || "cm")}
                      selectOptions={[
                        { value: "cm", label: "cm" },
                        { value: "mm", label: "mm" },
                        { value: "m", label: "m" },
                        { value: "in", label: "in" },
                        { value: "ft", label: "ft" },
                      ]}
                      selectAriaLabel={tModal("dimensionsUnit")}
                      selectDisabled={false}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{tModal("dimensionsHint")}</p>
                </div>
                <div>
                  <FieldLabel htmlFor="item-weight">{tModal("weight")}</FieldLabel>
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
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <FieldLabel>{tModal("attachments")}</FieldLabel>
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
                  {tModal("addAttachments")}
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
                            <span className="min-w-0 truncate text-slate-800 dark:text-slate-100">
                              {attachmentLabel(draft)}
                            </span>
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
                            {tModal("removeAttachment")}
                          </AppButton>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
