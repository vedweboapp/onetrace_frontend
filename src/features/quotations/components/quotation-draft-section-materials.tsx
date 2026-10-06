"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import {
  catalogSellingPriceNumber,
  catalogSellingPriceString,
  parseItemSellingPrice,
} from "@/features/items/utils/item-selling-price.util";
import { fetchGroup, fetchGroupsPage } from "@/features/groups/api/group.api";
import type { Group, GroupItemRef } from "@/features/groups/types/group.types";
import type { QuotationDraftLine } from "@/features/quotations/types/quotation-draft.types";
import {
  QuotationDraftCompositeLines,
  type CompositeLineLabels,
} from "@/features/quotations/components/quotation-draft-composite-lines";
import { draftPinTotal } from "@/features/quotations/utils/quotation-draft-compute.util";
import { resolveQuotationDraftLineGroup } from "@/features/quotations/utils/quotation-draft-line-group.util";
import { newQuotationDraftId } from "@/features/quotations/utils/quotation-draft-id.util";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import { AppButton, CheckmarkSelect, MoneyInput, NumericInput } from "@/shared/ui";
import type { CheckmarkSelectOption } from "@/shared/ui";

type Props = {
  pins: QuotationDraftLine[];
  readOnly?: boolean;
  saving?: boolean;
  onChange: (next: QuotationDraftLine[]) => void;
};

function parseQty(raw: string): number {
  const n = Number.parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

export function QuotationDraftSectionMaterials({ pins, readOnly = false, saving = false, onChange }: Props) {
  const t = useTranslations("Dashboard.quotations.draft");
  const tDraw = useTranslations("Dashboard.projects.drawings.editor");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const formId = React.useId();

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [itemRows, setItemRows] = React.useState<Item[]>([]);
  const [groupItemsByGroupId, setGroupItemsByGroupId] = React.useState<Record<string, GroupItemRef[]>>({});
  const [groupId, setGroupId] = React.useState("");
  const [compositeId, setCompositeId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitPrice, setUnitPrice] = React.useState("");

  React.useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    (async () => {
      try {
        const [gRes, iRes] = await Promise.all([
          fetchGroupsPage(1, 20, { dropdown: true }),
          fetchItemsPage(1, 20, { dropdown: true }),
        ]);
        if (!cancelled) {
          setGroups(gRes.items);
          setItemRows(iRes.items);
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

  const groupOptions = React.useMemo(
    () => [{ value: "", label: tDraw("allGroups") }, ...groups.map((g) => ({ value: String(g.id), label: g.name }))],
    [groups, tDraw],
  );

  const compositeOptions = React.useMemo((): CheckmarkSelectOption[] => {
    if (!groupId) {
      return [{ value: "", label: t("selectItem") }, ...itemRows.map((ci) => ({ value: String(ci.id), label: ci.name }))];
    }
    const entries = groupItemsByGroupId[groupId];
    if (entries === undefined) return [{ value: "", label: t("selectItem") }];
    const itemNameById: Record<number, string> = {};
    for (const ci of itemRows) itemNameById[ci.id] = ci.name;
    const uniqueByItem = new Map<number, CheckmarkSelectOption>();
    for (const ref of entries) {
      if (uniqueByItem.has(ref.item)) continue;
      const name =
        (typeof ref.item_name === "string" && ref.item_name.trim()) ||
        itemNameById[ref.item] ||
        null;
      uniqueByItem.set(ref.item, {
        value: String(ref.item),
        label: name ?? `#${ref.item}`,
      });
    }
    return [{ value: "", label: t("selectItem") }, ...Array.from(uniqueByItem.values())];
  }, [groupId, groupItemsByGroupId, itemRows, t]);

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
  const saveDisabled =
    !compositeId || compositeOptions.length <= 1 || (Boolean(groupId) && groupItemsByGroupId[groupId] === undefined);

  function groupItemRefFor(itemId: string): GroupItemRef | undefined {
    if (!groupId) return undefined;
    return (groupItemsByGroupId[groupId] ?? []).find((ref) => String(ref.item) === itemId);
  }

  function handleGroupChange(g: string) {
    setGroupId(g);
    setCompositeId("");
    setUnitPrice("");
    if (!g) return;
    void fetchGroup(Number.parseInt(g, 10))
      .then((row) => setGroupItemsByGroupId((cur) => ({ ...cur, [g]: row.items ?? [] })))
      .catch(() => setGroupItemsByGroupId((cur) => ({ ...cur, [g]: [] })));
  }

  function handleCompositeChange(c: string) {
    setCompositeId(c);
    const fromCatalog = catalogSellingPriceString(itemRows.find((r) => String(r.id) === c));
    if (fromCatalog) {
      setUnitPrice(fromCatalog);
      return;
    }
    const groupRef = groupItemRefFor(c);
    const raw = groupRef?.item_selling_price ?? groupRef?.selling_price;
    const n = parseItemSellingPrice(raw);
    setUnitPrice(n > 0 ? String(n) : "");
  }

  function addLine() {
    const id = Number.parseInt(compositeId, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    const picked = itemRows.find((r) => r.id === id);
    const groupRef = groupItemRefFor(compositeId);
    const label =
      picked?.name?.trim() ||
      (typeof groupRef?.item_name === "string" && groupRef.item_name.trim()) ||
      compositeOptions.find((o) => o.value === compositeId)?.label ||
      `Item ${id}`;
    const fromRow = parseItemSellingPrice(unitPrice);
    const fromGroup = parseItemSellingPrice(groupRef?.item_selling_price ?? groupRef?.selling_price);
    const unit = fromRow > 0 ? fromRow : catalogSellingPriceNumber(picked) || fromGroup;
    const qty = parseQty(quantity);
    const group = resolveQuotationDraftLineGroup(groupId, {
      groups,
      optionLabelById: Object.fromEntries(groupOptions.filter((o) => o.value).map((o) => [o.value, o.label])),
    });
    onChange([
      ...pins,
      {
        id: newQuotationDraftId("line"),
        pin_id: null,
        composite_item_id: id,
        name: label,
        quantity: qty,
        selling_price: unit,
        is_composite: false,
        ...group,
        pin_count: 1,
      },
    ]);
    setCompositeId("");
    setUnitPrice("");
    setQuantity("1");
  }

  return (
    <div className="space-y-3">
      {!readOnly ? (
        <div className="w-full min-w-0 space-y-1.5">
          <div className="flex max-w-4xl min-w-0 flex-row flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 sm:min-w-[11rem]">
              <CheckmarkSelect
                id={`${formId}-group`}
                portaled
                searchable
                listLabel={`${tDraw("chooseGroup")} *`}
                options={groupOptions}
                value={groupId}
                emptyLabel={tDraw("allGroups")}
                disabled={saving}
                onChange={handleGroupChange}
                className="w-full"
              />
            </div>
            <div className="min-w-0 flex-[1.25] sm:min-w-[12rem]">
              <CheckmarkSelect
                id={`${formId}-item`}
                portaled
                searchable
                listLabel={`${t("chooseItem")} *`}
                options={compositeOptions}
                value={compositeId}
                emptyLabel={t("selectItem")}
                disabled={compositeOptions.length <= 1 || saving}
                onChange={handleCompositeChange}
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
                disabled={saving || !compositeId}
                aria-label={t("unitPrice")}
                placeholder={t("unitPrice")}
                className="w-full"
                min={0}
                step="0.01"
              />
            </div>
            <AppButton type="button" variant="secondary" size="sm" disabled={saveDisabled || saving} onClick={addLine}>
              {t("saveComposite")}
            </AppButton>
          </div>
          {itemRows.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("noItems")}</p>
          ) : null}
        </div>
      ) : null}

      <QuotationDraftCompositeLines
        hideWhenEmpty
        pins={pins}
        saving={saving}
        locale={loc}
        labels={labels}
        onDuplicateLine={(li) => {
          const line = pins[li];
          if (!line) return;
          onChange([
            ...pins.slice(0, li + 1),
            { ...line, id: newQuotationDraftId("line"), pin_count: 1, quantity: 1 },
            ...pins.slice(li + 1),
          ]);
        }}
        onRemoveLines={(indices) => {
          const drop = new Set(indices);
          onChange(pins.filter((_, i) => !drop.has(i)));
        }}
        readOnly={readOnly}
      />

      {pins.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("emptyLines")}</p>
      ) : (
        <div className="flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("materialsTotal")}</span>
          <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {formatMoneyDisplay(materialsTotal, loc)}
          </span>
        </div>
      )}
    </div>
  );
}
