"use client";

import * as React from "react";
import { ChevronRight, FolderTree } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Item } from "@/features/items/types/item.types";
import {
  catalogSellingPriceNumber,
  parseItemSellingPrice,
} from "@/features/items/utils/item-selling-price.util";
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
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
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

function CrumbLink({
  label,
  onClick,
  current,
}: {
  label: string;
  onClick?: () => void;
  current?: boolean;
}) {
  if (current || !onClick) {
    return (
      <span className="truncate font-medium text-slate-700 dark:text-slate-200" aria-current="page">
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="truncate text-slate-500 transition hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
    >
      {label}
    </button>
  );
}

export function QuotationDraftSectionMaterials({
  pins,
  readOnly = false,
  saving = false,
  onChange,
  showAddForm = true,
}: Props) {
  const t = useTranslations("Dashboard.quotations.draft");
  const tTabs = useTranslations("Dashboard.quotations.formTabs");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const formId = React.useId();

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [groupId, setGroupId] = React.useState("");
  const [level, setLevel] = React.useState<PickerLevel>({ kind: "root" });
  const [loadingGroup, setLoadingGroup] = React.useState(false);
  const [pickedItemId, setPickedItemId] = React.useState("");
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
        const gRes = await fetchGroupsPage(1, 20, { dropdown: true });
        if (!cancelled) setGroups(gRes.items);
      } catch {
        if (!cancelled) setGroups([]);
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
      { value: "", label: t("groupPickerSelectGroup") },
      ...parentGroups.map((g) => ({ value: String(g.id), label: g.name })),
    ],
    [parentGroups, t],
  );

  const currentSubgroups: GroupSubgroup[] = React.useMemo(() => {
    if (level.kind === "group") return level.group.subgroups ?? [];
    return [];
  }, [level]);

  const currentItems: GroupItemRef[] = React.useMemo(() => {
    if (level.kind === "subgroup") return level.subgroup.items ?? [];
    return [];
  }, [level]);

  const itemOptions = React.useMemo(
    () => [
      { value: "", label: t("pickCompositePlaceholder") },
      ...currentItems.map((ref) => ({
        value: String(ref.item),
        label: itemLabel(ref),
      })),
    ],
    [currentItems, t],
  );

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
  const qtyValue = parseQty(quantity);
  const unitValue = parseItemSellingPrice(unitPrice);
  const lineTotal = qtyValue * (unitValue > 0 ? unitValue : 0);
  const saveDisabled = saving || !pickedItemId || level.kind !== "subgroup";

  function resetItemForm() {
    setPickedItemId("");
    setUnitPrice("");
    setQuantity("1");
  }

  async function handleGroupChange(nextId: string) {
    setGroupId(nextId);
    resetItemForm();
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

  function openSubgroup(subgroup: GroupSubgroup) {
    if (level.kind !== "group") return;
    resetItemForm();
    setLevel({ kind: "subgroup", group: level.group, subgroup });
  }

  function goToRoot() {
    resetItemForm();
    setGroupId("");
    setLevel({ kind: "root" });
  }

  function goToGroup() {
    if (level.kind === "subgroup") {
      resetItemForm();
      setLevel({ kind: "group", group: level.group });
    }
  }

  function handlePickItem(nextId: string) {
    setPickedItemId(nextId);
    if (!nextId) {
      setUnitPrice("");
      return;
    }
    const id = Number.parseInt(nextId, 10);
    const ref = currentItems.find((row) => row.item === id);
    if (!ref) {
      setUnitPrice("");
      return;
    }
    const price = itemUnitPrice(ref);
    setUnitPrice(price > 0 ? String(price) : "");
  }

  function addSelectedLine() {
    if (level.kind !== "subgroup" || !pickedItemId) return;
    const id = Number.parseInt(pickedItemId, 10);
    const ref = currentItems.find((row) => row.item === id);
    if (!ref) return;

    const qty = parseQty(quantity);
    const unit = itemUnitPrice(ref, undefined, unitPrice);
    const groupLookup = resolveQuotationDraftLineGroup(String(level.subgroup.id), {
      groups: [
        ...groups,
        { id: level.group.id, name: level.group.name },
        { id: level.subgroup.id, name: level.subgroup.name },
      ],
      optionLabelById: Object.fromEntries(
        groupOptions.filter((o) => o.value).map((o) => [o.value, o.label]),
      ),
    });

    onChangeRef.current([
      ...pinsRef.current,
      {
        id: newQuotationDraftId("line"),
        pin_id: null,
        composite_item_id: id,
        name: itemLabel(ref),
        quantity: qty,
        selling_price: unit,
        is_composite: false,
        ...groupLookup,
        pin_count: 1,
      },
    ]);
    resetItemForm();
  }

  if (!showAddForm && pins.length === 0) return null;

  return (
    <div className="space-y-3">
      {!readOnly && showAddForm ? (
        <div className="w-full min-w-0 space-y-3">
          <div className="max-w-md min-w-0">
            <CheckmarkSelect
              id={`${formId}-group`}
              portaled
              searchable
              listLabel={`${t("groupPickerSelectGroup")} *`}
              options={groupOptions}
              value={groupId}
              emptyLabel={t("groupPickerSelectGroup")}
              disabled={saving || loadingGroup}
              onChange={(value) => void handleGroupChange(value)}
              className="w-full"
            />
          </div>

          {level.kind === "root" ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("groupPickerSelectGroupHint")}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <nav
                aria-label={t("groupPickerBreadcrumbAria")}
                className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/50"
              >
                <CrumbLink label={tTabs("pricing")} onClick={goToRoot} />
                <ChevronRight className="size-3 shrink-0 text-slate-400" aria-hidden />
                <CrumbLink
                  label={level.group.name}
                  onClick={level.kind === "subgroup" ? goToGroup : undefined}
                  current={level.kind === "group"}
                />
                {level.kind === "subgroup" ? (
                  <>
                    <ChevronRight className="size-3 shrink-0 text-slate-400" aria-hidden />
                    <CrumbLink label={level.subgroup.name} current />
                  </>
                ) : null}
              </nav>

              {loadingGroup ? (
                <div className="space-y-2 p-3">
                  <div className="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
                  <div className="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
                </div>
              ) : level.kind === "group" ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentSubgroups.length === 0 ? (
                    <li className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {t("groupPickerNoSubgroups")}
                    </li>
                  ) : (
                    currentSubgroups.map((subgroup) => (
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
                    ))
                  )}
                </ul>
              ) : (
                <div className="space-y-3 p-3">
                  <div className="flex max-w-4xl min-w-0 flex-row flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1 sm:min-w-[14rem]">
                      <CheckmarkSelect
                        id={`${formId}-item`}
                        portaled
                        searchable
                        listLabel={t("pickCompositePlaceholder")}
                        options={itemOptions}
                        value={pickedItemId}
                        emptyLabel={t("pickCompositePlaceholder")}
                        disabled={saving || currentItems.length === 0}
                        onChange={handlePickItem}
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
                        disabled={saving || !pickedItemId}
                        aria-label={t("unitPrice")}
                        placeholder={t("unitPrice")}
                        className="w-full"
                        min={0}
                        step="0.01"
                      />
                    </div>
                    <div className="w-[7.5rem] shrink-0 sm:w-32">
                      <div
                        className={cn(
                          "flex h-9 items-center justify-end rounded-md border border-slate-200 bg-slate-50 px-2.5 text-sm tabular-nums text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
                        )}
                        aria-label={t("lineTotal")}
                        title={t("lineTotal")}
                      >
                        {formatMoneyDisplay(lineTotal, loc)}
                      </div>
                    </div>
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={saveDisabled}
                      onClick={addSelectedLine}
                    >
                      {t("saveComposite")}
                    </AppButton>
                  </div>

                  {currentItems.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("noItems")}</p>
                  ) : null}
                </div>
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
