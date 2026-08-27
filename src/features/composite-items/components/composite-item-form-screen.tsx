"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import {
  createCompositeItem,
  fetchCompositeItem,
  updateCompositeItem,
} from "@/features/composite-items/api/composite-item.api";
import { fetchInstallationTypesPage } from "@/features/installation-types/api/installation-type.api";
import { getInstallationTypeId } from "@/features/items/utils/item-installation-type.util";
import { formatInstallationTypeLabel } from "@/features/installation-types/utils/installation-type-display.util";
import { fetchUnitTypesPage } from "@/features/unit-types/api/unit-type.api";
import { formatUnitTypeShortLabel } from "@/features/unit-types/utils/unit-type-display.util";
import { getUnitTypeId, resolveDefaultUnitTypeSelectValue } from "@/features/items/utils/item-unit-type.util";
import {
  composeDimensionsInput,
  parseDimensionsInput,
} from "@/features/items/utils/item-dimensions-input.util";
import type { ItemAttachmentWriteRef } from "@/features/items/utils/item-write-form-data.util";
import {
  hasItemAttachment,
  resolveItemAttachmentLabel,
  resolveItemAttachmentUrl,
} from "@/features/items/utils/item-attachment-display.util";
import { fetchItemsPage } from "@/features/items/api/item.api";
import { cn } from "@/core/utils/http.util";
import type {
  DimensionUnit,
  InstallationCostType,
  ItemAttachment,
  ItemComponentRef,
  WeightUnit,
} from "@/features/items/types/item.types";
import type { Item } from "@/features/items/types/item.types";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { useQuickCreate, useSettingsQuickAdd } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { clearQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import {
  QUICK_CREATE_SELECT_TARGET_PARAM,
  hrefAfterEntityCreate,
  resolveFormBackUrl,
} from "@/shared/utils/quick-create-navigation.util";
import { checkmarkOptionsExcludingUsed } from "@/shared/utils/checkmark-options-excluding.util";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import {
  formatCompositePriceInput,
  sumCompositeComponentPrices,
} from "@/features/composite-items/utils/composite-component-prices.util";
import {
  AppButton,
  CheckmarkSelect,
  type CheckmarkSelectOption,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  DimensionsLwhInput,
  InputWithEndSelect,
  MoneyInput,
  NumericInput,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";
import { parseOrgMoneyOrNull } from "@/shared/money/format-money.util";

type Props = {
  mode: "create" | "edit";
  itemId?: number;
};

type ComponentRow = { id: string; dbId?: number; child_item: string; quantity: string };

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
  return resolveItemAttachmentLabel({
    id: draft.id,
    file_name: draft.file_name,
    file: draft.file_url,
  });
}

function attachmentUrl(draft: AttachmentDraft): string | null {
  return resolveItemAttachmentUrl({ file: draft.file_url, file_url: draft.file_url });
}

function mapApiAttachments(rows: ItemAttachment[] | null | undefined): AttachmentDraft[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter(hasItemAttachment).map((row) => ({
    key: nextAttachmentKey(),
    id: row.id,
    file_name: row.file_name ?? undefined,
    file_url: resolveItemAttachmentUrl(row) ?? undefined,
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

function unitTypeIdPayload(value: string): { unit_type?: number } {
  const id = toNumberOrNull(value);
  if (id == null || id <= 0) return {};
  return { unit_type: id };
}

function installationCostPayload(
  costRaw: string,
  typeRaw: InstallationCostType,
): { installation_cost?: number; installation_cost_type?: InstallationCostType } {
  const cost = parseOrgMoneyOrNull(costRaw);
  if (cost == null || cost < 0) return {};
  return { installation_cost: cost, installation_cost_type: typeRaw };
}

function dimensionsPayload(
  lengthRaw: string,
  widthRaw: string,
  heightRaw: string,
): { length?: number | null; width?: number | null; height?: number | null } {
  const lengthN = toNumberOrNull(lengthRaw);
  const widthN = toNumberOrNull(widthRaw);
  const heightN = toNumberOrNull(heightRaw);
  // Backend expects `length`, `width`, `height` together. If any is missing/invalid, send nothing.
  if (lengthN == null || widthN == null || heightN == null) return {};
  return { length: lengthN, width: widthN, height: heightN };
}

function weightPayload(valueRaw: string, unitRaw: WeightUnit): { weight?: number; weight_unit?: WeightUnit } {
  const value = toNumberOrNull(valueRaw);
  if (value == null || value < 0) return {};
  return { weight: value, weight_unit: unitRaw };
}

export function CompositeItemFormScreen({ mode, itemId }: Props) {
  const t = useTranslations("Dashboard.compositeItems");
  const tModal = useTranslations("Dashboard.compositeItems.modal");
  const tQuick = useTranslations("Dashboard.quickCreate");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = useFormBackUrl("composite-items", routes.dashboard.compositeItems);
  const isEdit = mode === "edit";
  const pendingItemRowRef = React.useRef<string | null>(null);

  const unitTypeQuickAdd = useSettingsQuickAdd({
    href: routes.dashboard.settingsUnitTypes,
    addLabel: tQuick("add.unitType"),
  });
  const installationTypeQuickAdd = useSettingsQuickAdd({
    href: routes.dashboard.settingsInstallationTypes,
    addLabel: tQuick("add.installationType"),
  });

  const nameId = React.useId();
  const skuId = React.useId();
  const unitId = React.useId();
  const qtyId = React.useId();
  const costId = React.useId();
  const sellId = React.useId();

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [qty, setQty] = React.useState("0");
  const [cost, setCost] = React.useState("0");
  const [sell, setSell] = React.useState("0");
  const costManualRef = React.useRef(isEdit);
  const sellManualRef = React.useRef(isEdit);
  const [rows, setRows] = React.useState<ComponentRow[]>([{ id: nextRowId(), child_item: "", quantity: "1" }]);
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
    unit_type: number | null;
    installation_cost: number | null;
    installation_cost_type: InstallationCostType | null;
    installation_hours: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
    dimensions_unit: DimensionUnit | null;
    weight: number | null;
    weight_unit: WeightUnit;
    components: { id?: number; child_item: number; quantity: number }[];
  } | null>(null);

  const [installationType, setInstallationType] = React.useState("");
  const [installationTypeOptions, setInstallationTypeOptions] = React.useState<CheckmarkSelectOption[]>([]);
  const [installationTypesError, setInstallationTypesError] = React.useState<string | null>(null);
  const [unitType, setUnitType] = React.useState("");
  const [unitTypeOptions, setUnitTypeOptions] = React.useState<CheckmarkSelectOption[]>([]);
  const [unitTypesError, setUnitTypesError] = React.useState<string | null>(null);
  const [installationCost, setInstallationCost] = React.useState("");
  const [installationCostType, setInstallationCostType] = React.useState<InstallationCostType>("fixed_amount");
  const [installationHours, setInstallationHours] = React.useState("");
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
    () => ({
      name,
      sku,
      qty,
      cost,
      sell,
      installationType,
      unitType,
      installationCost,
      installationCostType,
      installationHours,
      length,
      width,
      height,
      dimensionsInput,
      dimensionsUnit,
      weight,
      weightUnit,
      rows,
    }),
    [
      name,
      sku,
      qty,
      cost,
      sell,
      installationType,
      unitType,
      installationCost,
      installationCostType,
      installationHours,
      length,
      width,
      height,
      dimensionsInput,
      dimensionsUnit,
      weight,
      weightUnit,
      rows,
    ],
  );

  const restoreFormDraft = React.useCallback((draft: unknown) => {
    const saved = draft as {
      name?: string;
      sku?: string;
      qty?: string;
      cost?: string;
      sell?: string;
      installationType?: string;
      unitType?: string;
      installationCost?: string;
      installationCostType?: InstallationCostType;
      installationHours?: string;
      length?: string;
      width?: string;
      height?: string;
      dimensionsInput?: string;
      dimensionsUnit?: DimensionUnit;
      weight?: string;
      weightUnit?: WeightUnit;
      rows?: ComponentRow[];
    };
    if (typeof saved.name === "string") setName(saved.name);
    if (typeof saved.sku === "string") setSku(saved.sku);
    if (typeof saved.qty === "string") setQty(saved.qty);
    if (typeof saved.cost === "string") {
      setCost(saved.cost);
      costManualRef.current = true;
    }
    if (typeof saved.sell === "string") {
      setSell(saved.sell);
      sellManualRef.current = true;
    }
    if (typeof saved.installationType === "string") setInstallationType(saved.installationType);
    if (typeof saved.unitType === "string") setUnitType(saved.unitType);
    if (typeof saved.installationCost === "string") setInstallationCost(saved.installationCost);
    if (saved.installationCostType === "fixed_amount" || saved.installationCostType === "rate_per_hr") {
      setInstallationCostType(saved.installationCostType);
    }
    if (typeof saved.installationHours === "string") setInstallationHours(saved.installationHours);
    if (typeof saved.length === "string") setLength(saved.length);
    if (typeof saved.width === "string") setWidth(saved.width);
    if (typeof saved.height === "string") setHeight(saved.height);
    if (typeof saved.dimensionsUnit === "string") {
      const v = saved.dimensionsUnit;
      setDimensionsUnit(v);
    }
    if (typeof saved.dimensionsInput === "string") {
      setDimensionsInput(saved.dimensionsInput);
      const parsed = parseDimensionsInput(saved.dimensionsInput);
      setLength(parsed.length);
      setWidth(parsed.width);
      setHeight(parsed.height);
    } else {
      setDimensionsInput(composeDimensionsInput(saved.length ?? "", saved.width ?? "", saved.height ?? ""));
    }
    if (typeof saved.weight === "string") setWeight(saved.weight);
    if (saved.weightUnit === "kg" || saved.weightUnit === "g" || saved.weightUnit === "lb") {
      setWeightUnit(saved.weightUnit);
    }
    if (Array.isArray(saved.rows) && saved.rows.length > 0) setRows(saved.rows);
  }, []);

  React.useEffect(() => {
    if (costManualRef.current && sellManualRef.current) return;
    const totals = sumCompositeComponentPrices(rows, itemOptions);
    if (!costManualRef.current) setCost(formatCompositePriceInput(totals.cost));
    if (!sellManualRef.current) setSell(formatCompositePriceInput(totals.sell));
  }, [rows, itemOptions]);

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

  useQuickCreateReturn({
    restoreFormDraft: !isEdit ? restoreFormDraft : undefined,
    onReloadOptions: reloadItems,
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget !== "item") return;
      const rowId = pendingItemRowRef.current;
      if (rowId) {
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

            const newChildItemId = toNumberOrNull(selectId);
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

            return { ...x, child_item: selectId, dbId: newDbId };
          });
        });
      } else {
        setRows((prev) => {
          const emptyIdx = prev.findIndex((r) => !r.child_item.trim());
          if (emptyIdx >= 0) {
            const newChildItemId = toNumberOrNull(selectId);
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
            return prev.map((x, i) => (i === emptyIdx ? { ...x, child_item: selectId, dbId: newDbId } : x));
          }
          const newId = nextRowId();
          const newChildItemId = toNumberOrNull(selectId);
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
          return [...prev, { id: newId, child_item: selectId, quantity: "1", dbId: newDbId }];
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
      try {
        const itemsRes = await fetchItemsPage(1, 500, { isComposite: false });
        if (!cancelled) setItemOptions(itemsRes.items);
      } catch {
        if (!cancelled) setItemsError(tModal("itemsLoadError"));
      }
    })();

    (async () => {
      setInstallationTypesError(null);
      try {
        const installationTypesRes = await fetchInstallationTypesPage(1, 500, { is_active: true });
        if (!cancelled) {
          setInstallationTypeOptions(
            installationTypesRes.items.map((row) => ({
              value: String(row.id),
              label: formatInstallationTypeLabel(row),
            })),
          );
        }
      } catch {
        if (!cancelled) setInstallationTypesError(tModal("installationTypesLoadError"));
      }
    })();

    (async () => {
      setUnitTypesError(null);
      try {
        const unitTypesRes = await fetchUnitTypesPage(1, 500, { is_active: true });
        if (!cancelled) {
          const options = unitTypesRes.items.map((row) => ({
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
          costManualRef.current = true;
          sellManualRef.current = true;
          const installationTypeId = getInstallationTypeId(item.installation_type);
          setInstallationType(installationTypeId != null ? String(installationTypeId) : "");
          const unitTypeId = getUnitTypeId(item.unit_type);
          setUnitType(unitTypeId != null ? String(unitTypeId) : "");
          setInstallationCost(
            item.installation_cost != null && String(item.installation_cost).trim() !== ""
              ? String(item.installation_cost)
              : "",
          );
          const costType = item.installation_cost_type;
          setInstallationCostType(costType === "rate_per_hr" ? "rate_per_hr" : "fixed_amount");
          setInstallationHours(
            item.installation_hours != null && String(item.installation_hours).trim() !== ""
              ? String(item.installation_hours)
              : "",
          );
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
              ? composeDimensionsInput(String(item.length), String(item.width), String(item.height))
              : typeof item.dimensions === "string"
                ? item.dimensions
                : "",
          );
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
          setWeightUnit(item.weight_unit === "g" || item.weight_unit === "lb" ? item.weight_unit : "kg");
          const attDrafts = mapApiAttachments(item.attachments);
          setAttachmentDrafts(attDrafts);
          initialAttachmentDraftsRef.current = attDrafts.map((d) => ({ ...d }));
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
            unit_type: unitTypeId != null ? unitTypeId : null,
            installation_cost: toNumberOrNull(String(item.installation_cost ?? "")),
            installation_cost_type:
              item.installation_cost_type === "rate_per_hr" ? "rate_per_hr" : "fixed_amount",
            installation_hours: toNumberOrNull(String(item.installation_hours ?? "")),
            length: toNumberOrNull(String(item.length ?? "")),
            width: toNumberOrNull(String(item.width ?? "")),
            height: toNumberOrNull(String(item.height ?? "")),
            dimensions_unit: dimUnit,
            weight: toNumberOrNull(String(item.weight ?? "")),
            weight_unit: item.weight_unit === "g" || item.weight_unit === "lb" ? item.weight_unit : "kg",
            components: comps.map((c) => ({
              id: c.id,
              child_item: Number(c.child_item),
              quantity: Number(c.quantity),
            })),
          };
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
      toastError(tModal("duplicateComponentError"));
      return;
    }

    const installationTypePayload = installationTypeIdPayload(installationType);
    const unitTypePayload = unitTypeIdPayload(unitType);
    const installationCostFields = installationCost.trim()
      ? installationCostPayload(installationCost, installationCostType)
      : {};
    const installationHoursValue = installationHours.trim()
      ? toNumberOrNull(installationHours)
      : null;
    const dimensionsFields = dimensionsPayload(length, width, height);
    const hasDimensions = Object.keys(dimensionsFields).length > 0;
    const weightFields = weight.trim() ? weightPayload(weight, weightUnit) : {};
    const attachmentRefs = buildAttachmentRefs(attachmentDrafts);

    setSubmitting(true);
    try {
      let saved: any;
      if (isEdit && itemId) {
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

        const currentUnitType = toNumberOrNull(unitType);
        if (currentUnitType !== init.unit_type) {
          payload.unit_type = currentUnitType;
        }

        const currentInstCost = installationCost.trim() ? parseOrgMoneyOrNull(installationCost) : null;
        if (currentInstCost !== init.installation_cost) {
          payload.installation_cost = currentInstCost;
        }
        if (installationCostType !== (init.installation_cost_type ?? "fixed_amount")) {
          payload.installation_cost_type = installationCost.trim() ? installationCostType : null;
        }
        if (installationHoursValue !== init.installation_hours) {
          payload.installation_hours = installationHoursValue;
        }
        const currentLength = length.trim() ? toNumberOrNull(length) : null;
        if (currentLength !== init.length) {
          payload.length = currentLength;
        }

        const currentWidth = width.trim() ? toNumberOrNull(width) : null;
        if (currentWidth !== init.width) {
          payload.width = currentWidth;
        }

        const currentHeight = height.trim() ? toNumberOrNull(height) : null;
        if (currentHeight !== init.height) {
          payload.height = currentHeight;
        }

        if (hasDimensions) {
          const initDimsUnit = init.dimensions_unit ?? "cm";
          if (dimensionsUnit !== initDimsUnit) {
            payload.dimensions_unit = dimensionsUnit;
          }
        } else if ([length, width, height].every((v) => !v.trim())) {
          const initDimsUnit = init.dimensions_unit ?? "cm";
          if (initDimsUnit != null) {
            payload.dimensions_unit = null;
          }
        }
        const currentWeight = weight.trim() ? toNumberOrNull(weight) : null;
        if (currentWeight !== init.weight) {
          payload.weight = currentWeight;
        }
        if (weightUnit !== (init.weight_unit ?? "kg")) {
          payload.weight_unit = weight.trim() ? weightUnit : null;
        }

        const compsEqual = areComponentsEqual(init.components, comps, deletedComponents);
        if (!compsEqual) {
          payload.components = [...comps, ...deletedComponents];
        }

        if (Object.keys(payload).length === 0 && attachmentRefs.length === 0) {
          toastSuccess(tModal("updatedToast"));
          router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.compositeItems, itemId, safeBack));
          return;
        }

        saved = await updateCompositeItem(itemId, payload, { attachmentRefs });
      } else {
        saved = await createCompositeItem(
          {
            name: name.trim(),
            sku: sku.trim(),
            quantity: qtyN,
            cost_price: costN,
            selling_price: sellN,
            components: comps,
            ...installationTypePayload,
            ...unitTypePayload,
            ...installationCostFields,
            ...(installationHoursValue != null ? { installation_hours: installationHoursValue } : {}),
            ...dimensionsFields,
            ...(hasDimensions ? { dimensions_unit: dimensionsUnit } : {}),
            ...weightFields,
          },
          { attachmentRefs },
        );
      }

      toastSuccess(isEdit ? tModal("updatedToast") : tModal("createdToast"));
      if (!isEdit) clearQuickCreateFormDraft(draftReturnTo);
      router.replace(
        hrefAfterEntityCreate({
          createdId: saved.id,
          selectTarget: isEdit ? null : searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM),
          backHref: safeBack,
          listPath: routes.dashboard.compositeItems,
        }),
      );
    } catch (error) {
      toastApiError(error, t("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

  const noItems = itemOptions.length === 0;

  const installationCostTypeOptions = React.useMemo<CheckmarkSelectOption[]>(
    () => [
      { value: "fixed_amount", label: tModal("installationCostTypeFixed") },
      { value: "rate_per_hr", label: tModal("installationCostTypeRate") },
    ],
    [tModal],
  );

  const weightUnitOptions = React.useMemo<CheckmarkSelectOption[]>(
    () => [
      { value: "kg", label: "kg" },
      { value: "g", label: "g" },
      { value: "lb", label: "lb" },
    ],
    [],
  );

  const visibleAttachments = attachmentDrafts.filter((d) => !d.removed);

  function onAttachmentFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      key: nextAttachmentKey(),
      file,
      file_name: file.name,
    }));
    setAttachmentDrafts((prev) => [...prev, ...next]);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  }

  function removeAttachment(key: string) {
    setAttachmentDrafts((prev) =>
      prev
        .map((d) => {
          if (d.key !== key) return d;
          if (d.id != null) return { ...d, removed: true };
          return null;
        })
        .filter((d): d is AttachmentDraft => d != null),
    );
  }

  return (
    <div className="w-full min-w-0 shrink-0">
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
      <SurfaceShell className="overflow-visible rounded-none border-0 shadow-none ring-0">
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
            <FormFieldRow cols="2" from="md" className="gap-4">
              <FieldGroup label={tModal("name")} htmlFor={nameId} required>
                <input id={nameId} type="text" autoComplete="off" value={name} onChange={(e) => setName(sanitizeTitleInput(e.target.value))} onBlur={() => setNameTouched(true)} disabled={submitting} placeholder={tModal("namePlaceholder")} className={surfaceInputClassName} />
                {nameInvalid ? <FieldErrorText>{tModal("nameError")}</FieldErrorText> : null}
              </FieldGroup>
              <FieldGroup label={tModal("sku")} htmlFor={skuId} required>
                <input id={skuId} type="text" autoComplete="off" value={sku} onChange={(e) => setSku(e.target.value)} onBlur={() => setSkuTouched(true)} disabled={submitting} placeholder={tModal("skuPlaceholder")} className={cn(surfaceInputClassName, skuInvalid && "border-red-500 focus:border-red-500 focus:ring-red-500/20")} />
                {skuInvalid ? <FieldErrorText>{tModal("skuError")}</FieldErrorText> : null}
              </FieldGroup>
            </FormFieldRow>
            <FormFieldRow cols="2" from="md" className="gap-4">
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
                {unitTypesError ? (
                  <p className="mt-1.5 text-sm text-amber-700 dark:text-amber-300">{unitTypesError}</p>
                ) : null}
              </FieldGroup>
              <FieldGroup label={tModal("quantity")} htmlFor={qtyId} required>
                <NumericInput
                  id={qtyId}
                  integer
                  value={qty}
                  onChange={setQty}
                  disabled={submitting}
                />
              </FieldGroup>
            </FormFieldRow>
            <FormFieldRow cols="2" from="md" className="gap-4">
              <FieldGroup label={tModal("installationType")}>
                {installationTypesError ? (
                  <p className="mb-1.5 text-sm text-amber-700 dark:text-amber-300">{installationTypesError}</p>
                ) : null}
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
                  className="w-full"
                  onAdd={installationTypeQuickAdd.onAdd}
                  addAriaLabel={installationTypeQuickAdd.addAriaLabel}
                  addLabel={installationTypeQuickAdd.addLabel}
                />
              </FieldGroup>
              <FieldGroup label={tModal("installationCost")} htmlFor="composite-installation-cost">
                <InputWithEndSelect
                  inputId="composite-installation-cost"
                  orgMoney
                  showCurrencyAffix
                  inputMode="decimal"
                  inputValue={installationCost}
                  onInputChange={setInstallationCost}
                  placeholder={tModal("installationCostPlaceholder")}
                  disabled={submitting}
                  selectValue={installationCostType}
                  onSelectChange={(v) => setInstallationCostType(v === "rate_per_hr" ? "rate_per_hr" : "fixed_amount")}
                  selectOptions={installationCostTypeOptions}
                  selectAriaLabel={tModal("installationCostType")}
                />
              </FieldGroup>
            </FormFieldRow>
            <FormFieldRow cols="2" from="md" className="gap-4">
              <FieldGroup label={tModal("installationHours")} htmlFor="composite-installation-hours">
                <NumericInput
                  id="composite-installation-hours"
                  maxDecimals={2}
                  value={installationHours}
                  onChange={setInstallationHours}
                  placeholder={tModal("installationHoursPlaceholder")}
                  disabled={submitting}
                />
              </FieldGroup>
            </FormFieldRow>
            <FormFieldRow cols="2" from="md" className="gap-4">
              <FieldGroup label={tModal("costPrice")} htmlFor={costId} required>
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
              <FieldGroup label={tModal("sellingPrice")} htmlFor={sellId} required>
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
            <div
              className={cn(
                "grid w-full gap-x-[var(--form-label-gap,0.75rem)] gap-y-3",
                "md:grid-cols-[var(--form-label-col,9.5rem)_minmax(0,1fr)]",
              )}
            >
              <h3 className="field-label text-sm font-semibold text-slate-900 dark:text-slate-100 md:pt-[calc((var(--form-control-height,2.75rem)-1.35em)/2)]">
                {tModal("fulfilmentDetails")}
              </h3>
              <div className="form-fields-host min-w-0">
                <div className="form-field-row grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                <FieldGroup label={tModal("dimensions")} htmlFor="composite-dimensions">
                  <DimensionsLwhInput
                    id="composite-dimensions"
                    length={length}
                    width={width}
                    height={height}
                    onChange={(next) => {
                      setLength(next.length);
                      setWidth(next.width);
                      setHeight(next.height);
                      setDimensionsInput(composeDimensionsInput(next.length, next.width, next.height));
                    }}
                    unit={dimensionsUnit}
                    onUnitChange={(v) => setDimensionsUnit((v as DimensionUnit) ?? "cm")}
                    unitAriaLabel={tModal("dimensionsUnit")}
                    lengthAriaLabel={tModal("dimensionsLength")}
                    widthAriaLabel={tModal("dimensionsWidth")}
                    heightAriaLabel={tModal("dimensionsHeight")}
                    disabled={submitting}
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{tModal("dimensionsHint")}</p>
                </FieldGroup>
                <FieldGroup label={tModal("weight")} htmlFor="composite-weight">
                  <InputWithEndSelect
                    inputId="composite-weight"
                    inputType="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    inputValue={weight}
                    onInputChange={setWeight}
                    disabled={submitting}
                    selectValue={weightUnit}
                    onSelectChange={(v) => setWeightUnit((v as WeightUnit) || "kg")}
                    selectOptions={weightUnitOptions}
                    selectAriaLabel={tModal("weightUnit")}
                  />
                </FieldGroup>
              </div>
              </div>
            </div>
            <FieldGroup label={tModal("components")}>
              {itemsError ? <p className="mb-1.5 text-sm text-amber-700 dark:text-amber-300">{itemsError}</p> : null}
              <div className="space-y-2">
                {rows.map((r, idx) => (
                  <div key={r.id} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="min-w-0 w-full sm:max-w-[22rem] sm:flex-1">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{tModal("childItem")}<span className="ml-1 text-red-500">*</span></span>
                      <CheckmarkSelect
                        listLabel={tModal("childItem")}
                        buttonAriaLabel={tModal("childItem")}
                        value={r.child_item}
                        onChange={(v) => updateRowChildItem(r.id, v)}
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
                    <div className="w-[5.5rem] shrink-0">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{tModal("componentQuantity")}</span>
                      <NumericInput
                        integer
                        value={r.quantity}
                        onChange={(v) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, quantity: v } : x)))}
                        disabled={submitting}
                      />
                    </div>
                    <div className="flex shrink-0 gap-2 pb-px">
                      <AppButton type="button" variant="secondary" size="sm" onClick={() => removeRow(r.id)} disabled={submitting || rows.length <= 1}>{tModal("removeComponent")}</AppButton>
                      {idx === rows.length - 1 ? <AppButton type="button" variant="secondary" size="sm" onClick={() => setRows((prev) => [...prev, { id: nextRowId(), child_item: "", quantity: "1" }])} disabled={submitting}>{tModal("addComponent")}</AppButton> : null}
                    </div>
                  </div>
                ))}
              </div>
              {componentsInvalid ? <FieldErrorText>{tModal("atLeastOneComponentError")}</FieldErrorText> : null}
            </FieldGroup>
            <FieldGroup label={tModal("attachments")}>
              <div className="flex items-center gap-2">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  className="sr-only"
                  disabled={submitting}
                  onChange={(e) => onAttachmentFilesSelected(e.target.files)}
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
              {visibleAttachments.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {visibleAttachments.map((draft) => {
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
                            className="min-w-0 truncate text-blue-600 underline-offset-2 hover:underline"
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
                          onClick={() => removeAttachment(draft.key)}
                        >
                          {tModal("removeAttachment")}
                        </AppButton>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </FieldGroup>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
