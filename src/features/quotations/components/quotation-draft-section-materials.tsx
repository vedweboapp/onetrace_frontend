"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight, FolderTree } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import {
  catalogSellingPriceNumber,
  catalogSellingPriceString,
  parseItemSellingPrice,
} from "@/features/items/utils/item-selling-price.util";
import { resolveItemType } from "@/features/items/utils/item-type.util";
import { fetchGroup, fetchGroupsPage } from "@/features/groups/api/group.api";
import type { Group, GroupItemRef, GroupSubgroup } from "@/features/groups/types/group.types";
import { isSelectableParentGroup } from "@/features/groups/utils/group-parent-payload.util";
import type { QuotationDraftLine } from "@/features/quotations/types/quotation-draft.types";
import {
  QuotationDraftCompositeLines,
  QuotationDraftPriceTotalBar,
  type CompositeLineLabels,
} from "@/features/quotations/components/quotation-draft-composite-lines";
import { draftPinTotal } from "@/features/quotations/utils/quotation-draft-compute.util";
import { resolveQuotationDraftLineGroup } from "@/features/quotations/utils/quotation-draft-line-group.util";
import { newQuotationDraftId } from "@/features/quotations/utils/quotation-draft-id.util";
import { AppButton, CheckmarkSelect, MoneyInput, NumericInput } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  pins: QuotationDraftLine[];
  readOnly?: boolean;
  saving?: boolean;
  onChange: (next: QuotationDraftLine[]) => void;
  /** When false, only the added goods lines are shown. */
  showAddForm?: boolean;
};

type PickerLevel =
  | { kind: "root" }
  | { kind: "group"; group: Group }
  | { kind: "subgroup"; group: Group; subgroup: GroupSubgroup };

function parseQty(raw: string): number {
  const n = Number.parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

function itemLabel(ref: GroupItemRef, catalog?: Item): string {
  return (
    (typeof ref.item_name === "string" && ref.item_name.trim()) ||
    catalog?.name?.trim() ||
    `#${ref.item}`
  );
}

function itemUnitPrice(ref: GroupItemRef, catalog?: Item, override?: string): number {
  const fromOverride = parseItemSellingPrice(override);
  if (fromOverride > 0) return fromOverride;
  const fromGroup = parseItemSellingPrice(ref.item_selling_price ?? ref.selling_price);
  if (fromGroup > 0) return fromGroup;
  return catalogSellingPriceNumber(catalog);
}

export function QuotationDraftSectionMaterials({
  pins,
  readOnly = false,
  saving = false,
  onChange,
  showAddForm = true,
}: Props) {
  const t = useTranslations("Dashboard.quotations.draft");
  const tDraw = useTranslations("Dashboard.projects.drawings.editor");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const formId = React.useId();

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [itemRows, setItemRows] = React.useState<Item[]>([]);
  const [groupId, setGroupId] = React.useState("");
  const [level, setLevel] = React.useState<PickerLevel>({ kind: "root" });
  const [loadingGroup, setLoadingGroup] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [quantity, setQuantity] = React.useState("1");
  const [unitPrice, setUnitPrice] = React.useState("");
  const pinsRef = React.useRef(pins);
  pinsRef.current = pins;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    (async () => {
      try {
        const [gRes, iRes] = await Promise.all([
          fetchGroupsPage(1, 20, { dropdown: true }),
          fetchItemsPage(1, 20, { dropdown: true, itemType: "goods" }),
        ]);
        if (!cancelled) {
          setGroups(gRes.items);
          setItemRows(iRes.items.filter((row) => resolveItemType(row.item_type) === "goods"));
        }
      } catch {
        if (!cancelled) {
          setGroups([]);
          setItemRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  const parentGroups = React.useMemo(
    () => groups.filter((g) => isSelectableParentGroup(g)),
    [groups],
  );

  const groupOptions = React.useMemo(
    () => [
      { value: "", label: tDraw("allGroups") },
      ...parentGroups.map((g) => ({ value: String(g.id), label: g.name })),
    ],
    [parentGroups, tDraw],
  );

  const currentItems: GroupItemRef[] = React.useMemo(() => {
    if (level.kind === "group") return level.group.items ?? [];
    if (level.kind === "subgroup") return level.subgroup.items ?? [];
    return [];
  }, [level]);

  const currentSubgroups: GroupSubgroup[] = React.useMemo(() => {
    if (level.kind === "group") return level.group.subgroups ?? [];
    return [];
  }, [level]);

  const labels = React.useMemo<CompositeLineLabels>(
    () => ({
      duplicateLine: t("duplicateLine"),
      removeLine: t("removeLine"),
      rowActions: t("rowActions"),
      unitPrice: t("unitPrice"),
      lineTotal: t("lineTotal"),
    }),
    [t],
  );

  const materialsTotal = pins.reduce((acc, ln) => acc + draftPinTotal(ln), 0);
  const catalogMode = !groupId;
  const saveDisabled = saving || selectedIds.size === 0;

  function resetSelection() {
    setSelectedIds(new Set());
    setUnitPrice("");
    setQuantity("1");
  }

  async function handleGroupChange(nextId: string) {
    setGroupId(nextId);
    resetSelection();
    if (!nextId) {
      setLevel({ kind: "root" });
      return;
    }
    setLoadingGroup(true);
    try {
      const detail = await fetchGroup(Number.parseInt(nextId, 10));
      setLevel({ kind: "group", group: detail });
    } catch {
      setLevel({ kind: "root" });
    } finally {
      setLoadingGroup(false);
    }
  }

  function toggleItem(itemId: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
    const ref = currentItems.find((row) => row.item === itemId);
    const catalog = itemRows.find((row) => row.id === itemId);
    if (ref) {
      const price = itemUnitPrice(ref, catalog);
      if (price > 0) setUnitPrice(String(price));
    } else if (catalog) {
      const fromCatalog = catalogSellingPriceString(catalog);
      if (fromCatalog) setUnitPrice(fromCatalog);
    }
  }

  function openSubgroup(subgroup: GroupSubgroup) {
    if (level.kind !== "group") return;
    resetSelection();
    setLevel({ kind: "subgroup", group: level.group, subgroup });
  }

  function goBack() {
    resetSelection();
    if (level.kind === "subgroup") {
      setLevel({ kind: "group", group: level.group });
      return;
    }
    setGroupId("");
    setLevel({ kind: "root" });
  }

  function addSelectedLines() {
    const qty = parseQty(quantity);
    const groupLookup = resolveQuotationDraftLineGroup(
      level.kind === "subgroup"
        ? String(level.subgroup.id)
        : level.kind === "group"
          ? String(level.group.id)
          : groupId,
      {
        groups: [
          ...groups,
          ...(level.kind === "group" || level.kind === "subgroup"
            ? [{ id: level.group.id, name: level.group.name }]
            : []),
          ...(level.kind === "subgroup"
            ? [{ id: level.subgroup.id, name: level.subgroup.name }]
            : []),
        ],
        optionLabelById: Object.fromEntries(groupOptions.filter((o) => o.value).map((o) => [o.value, o.label])),
      },
    );

    const nextLines: QuotationDraftLine[] = [];

    if (catalogMode) {
      for (const id of selectedIds) {
        const picked = itemRows.find((row) => row.id === id);
        if (!picked) continue;
        const unit =
          selectedIds.size === 1 && parseItemSellingPrice(unitPrice) > 0
            ? parseItemSellingPrice(unitPrice)
            : catalogSellingPriceNumber(picked);
        nextLines.push({
          id: newQuotationDraftId("line"),
          pin_id: null,
          composite_item_id: id,
          name: picked.name?.trim() || `Item ${id}`,
          quantity: qty,
          selling_price: unit,
          is_composite: false,
          group_id: null,
          group_name: null,
          pin_count: 1,
        });
      }
    } else {
      for (const id of selectedIds) {
        const ref = currentItems.find((row) => row.item === id);
        if (!ref) continue;
        const catalog = itemRows.find((row) => row.id === id);
        const unit =
          selectedIds.size === 1
            ? itemUnitPrice(ref, catalog, unitPrice)
            : itemUnitPrice(ref, catalog);
        nextLines.push({
          id: newQuotationDraftId("line"),
          pin_id: null,
          composite_item_id: id,
          name: itemLabel(ref, catalog),
          quantity: qty,
          selling_price: unit,
          is_composite: false,
          ...groupLookup,
          pin_count: 1,
        });
      }
    }

    if (nextLines.length === 0) return;
    onChangeRef.current([...pinsRef.current, ...nextLines]);
    resetSelection();
  }

  function toggleCatalogItem(itemId: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
    const catalog = itemRows.find((row) => row.id === itemId);
    const fromCatalog = catalogSellingPriceString(catalog);
    if (fromCatalog) setUnitPrice(fromCatalog);
  }

  if (!showAddForm && pins.length === 0) return null;

  return (
    <div className="space-y-3">
      {!readOnly && showAddForm ? (
        <div className="w-full min-w-0 space-y-3">
          <div className="flex max-w-4xl min-w-0 flex-row flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 sm:min-w-[14rem]">
              <CheckmarkSelect
                id={`${formId}-group`}
                portaled
                searchable
                listLabel={`${tDraw("chooseGroup")} *`}
                options={groupOptions}
                value={groupId}
                emptyLabel={tDraw("allGroups")}
                disabled={saving || loadingGroup}
                onChange={(value) => void handleGroupChange(value)}
                className="w-full"
              />
            </div>
            <div className="w-[6.5rem] shrink-0 sm:w-28">
              <NumericInput
                integer
                value={quantity}
                onChange={setQuantity}
                disabled={saving}
                aria-label={t("qty")}
                placeholder={t("qty")}
                className="w-full"
              />
            </div>
            <div className="w-[7.5rem] shrink-0 sm:w-32">
              <MoneyInput
                size="sm"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                disabled={saving || selectedIds.size !== 1}
                aria-label={t("unitPrice")}
                placeholder={t("unitPrice")}
                className="w-full"
                min={0}
                step="0.01"
              />
            </div>
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={saveDisabled || selectedIds.size === 0}
              onClick={addSelectedLines}
            >
              {t("saveComposite")}
            </AppButton>
          </div>

          {catalogMode ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              {itemRows.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">{t("noItems")}</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itemRows.map((row) => {
                    const checked = selectedIds.has(row.id);
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => toggleCatalogItem(row.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                            checked
                              ? "bg-slate-50 dark:bg-slate-900/60"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-900/40",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex size-4 shrink-0 items-center justify-center rounded border",
                              checked
                                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                                : "border-slate-300 dark:border-slate-600",
                            )}
                            aria-hidden
                          >
                            {checked ? <Check className="size-3" /> : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {row.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                {level.kind !== "root" ? (
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    onClick={goBack}
                    aria-label={t("groupPickerBack")}
                    title={t("groupPickerBack")}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                ) : null}
                <FolderTree className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                <p className="min-w-0 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                  {level.kind === "subgroup"
                    ? `${level.group.name} / ${level.subgroup.name}`
                    : level.kind === "group"
                      ? level.group.name
                      : tDraw("chooseGroup")}
                </p>
              </div>

              {loadingGroup ? (
                <div className="space-y-2 p-3">
                  <div className="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
                  <div className="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentSubgroups.map((subgroup) => (
                    <li key={subgroup.id}>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => openSubgroup(subgroup)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      >
                        <FolderTree className="size-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {subgroup.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {t("groupPickerSubgroupItems", { count: subgroup.items?.length ?? 0 })}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                      </button>
                    </li>
                  ))}

                  {currentItems.map((ref) => {
                    const checked = selectedIds.has(ref.item);
                    return (
                      <li key={`${ref.id ?? "x"}-${ref.item}`}>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => toggleItem(ref.item)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                            checked
                              ? "bg-slate-50 dark:bg-slate-900/60"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-900/40",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex size-4 shrink-0 items-center justify-center rounded border",
                              checked
                                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                                : "border-slate-300 dark:border-slate-600",
                            )}
                            aria-hidden
                          >
                            {checked ? <Check className="size-3" /> : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {itemLabel(ref, itemRows.find((row) => row.id === ref.item))}
                            {ref.abbreviation?.trim() ? (
                              <span className="font-normal text-slate-500"> ({ref.abbreviation.trim()})</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}

                  {!loadingGroup && currentSubgroups.length === 0 && currentItems.length === 0 ? (
                    <li className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">{t("noItems")}</li>
                  ) : null}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : null}

      <QuotationDraftCompositeLines
        hideWhenEmpty
        pins={pins}
        saving={saving}
        locale={loc}
        labels={labels}
        onDuplicateLine={(li) => {
          const current = pinsRef.current;
          const line = current[li];
          if (!line) return;
          onChangeRef.current([
            ...current.slice(0, li + 1),
            { ...line, id: newQuotationDraftId("line"), pin_count: 1, quantity: 1 },
            ...current.slice(li + 1),
          ]);
        }}
        onRemoveLines={(indices) => {
          const drop = new Set(indices);
          onChangeRef.current(pinsRef.current.filter((_, i) => !drop.has(i)));
        }}
        readOnly={readOnly}
      />

      {pins.length === 0 ? (
        showAddForm ? <p className="text-sm text-slate-500 dark:text-slate-400">{t("emptyLines")}</p> : null
      ) : (
        <QuotationDraftPriceTotalBar
          label={t("materialsTotal")}
          amount={materialsTotal}
          locale={loc}
          showMenuSpacer={!readOnly}
        />
      )}
    </div>
  );
}
