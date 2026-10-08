"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fetchItem, fetchItemsPage } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import { parseItemNumber, suggestedItemSellPrice } from "@/features/items/utils/item-pricing.util";
import { resolveItemType } from "@/features/items/utils/item-type.util";
import type { QuotationDraftServiceLine } from "@/features/quotations/types/quotation-draft.types";
import { QuotationDraftPriceTotalBar } from "@/features/quotations/components/quotation-draft-composite-lines";
import { draftServiceLineTotal } from "@/features/quotations/utils/quotation-draft-compute.util";
import { newQuotationDraftId } from "@/features/quotations/utils/quotation-draft-id.util";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import { serviceLineSellPrice } from "@/features/quotations/utils/quotation-section-type.util";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn, type QuickCreateSelectApplied } from "@/shared/hooks/use-quick-create-return";
import { AppButton, CheckmarkSelect, MoneyInput, NumericInput, surfaceInputClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  services: QuotationDraftServiceLine[];
  readOnly?: boolean;
  saving?: boolean;
  onChange: (next: QuotationDraftServiceLine[]) => void;
  /** Persist parent section draft before navigating to quick-create. */
  getFormDraft?: () => unknown;
};

function serviceFromItem(row: Item): QuotationDraftServiceLine {
  const cost = parseItemNumber(row.cost_price);
  const markup = parseItemNumber(row.markup);
  const sell =
    parseItemNumber(row.selling_price) || suggestedItemSellPrice(cost, markup) || serviceLineSellPrice(cost, markup);
  return {
    id: newQuotationDraftId("svc"),
    item_id: row.id,
    item_name: row.name?.trim() || null,
    cost_price: cost,
    markup_percentage: markup,
    selling_price: sell,
  };
}

export function QuotationDraftSectionServices({
  services,
  readOnly = false,
  saving = false,
  onChange,
  getFormDraft,
}: Props) {
  const t = useTranslations("Dashboard.quotations.draft");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const [options, setOptions] = React.useState<Item[]>([]);
  const [pickId, setPickId] = React.useState("");
  const servicesRef = React.useRef(services);
  servicesRef.current = services;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const reloadOptions = React.useCallback(async () => {
    try {
      const { items } = await fetchItemsPage(1, 100, { dropdown: true, itemType: "service" });
      setOptions(items.filter((row) => resolveItemType(row.item_type) === "service"));
    } catch {
      setOptions([]);
    }
  }, []);

  React.useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchItemsPage(1, 100, { dropdown: true, itemType: "service" });
        if (!cancelled) setOptions(items.filter((row) => resolveItemType(row.item_type) === "service"));
      } catch {
        if (!cancelled) setOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  const usedItemIds = React.useMemo(() => {
    const ids = new Set<number>();
    for (const row of services) {
      if (row.item_id != null && row.item_id > 0) ids.add(row.item_id);
    }
    return ids;
  }, [services]);

  const selectOptions = React.useMemo(
    () => [
      { value: "", label: t("serviceSelect") },
      ...options
        .filter((row) => !usedItemIds.has(row.id))
        .map((row) => ({ value: String(row.id), label: row.name?.trim() || `#${row.id}` })),
    ],
    [options, t, usedItemIds],
  );

  const servicesTotal = services.reduce((acc, row) => acc + draftServiceLineTotal(row), 0);

  function addServiceFromId(id: number, catalog: Item[] = options) {
    if (!Number.isFinite(id) || id <= 0) return false;
    if (servicesRef.current.some((row) => row.item_id === id)) return false;
    const row = catalog.find((x) => x.id === id);
    if (!row) return false;
    onChangeRef.current([...servicesRef.current, serviceFromItem(row)]);
    setPickId("");
    return true;
  }

  function addService() {
    const id = Number.parseInt(pickId, 10);
    addServiceFromId(id);
  }

  function patchService(index: number, patch: Partial<QuotationDraftServiceLine>) {
    onChange(services.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeService(index: number) {
    onChange(services.filter((_, i) => i !== index));
  }

  const itemQuickCreate = useQuickCreate({
    kind: "item",
    addDisabled: readOnly || saving,
    getFormDraft: readOnly ? undefined : getFormDraft,
  });

  const applyQuickCreateSelect = React.useCallback(({ selectTarget, selectId }: QuickCreateSelectApplied) => {
    if (selectTarget !== "item") return;
    const id = Number.parseInt(selectId, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    void (async () => {
      try {
        const row = await fetchItem(id);
        setOptions((prev) => [...prev.filter((x) => x.id !== row.id), row]);
        addServiceFromId(id, [row]);
      } catch {
        try {
          const { items } = await fetchItemsPage(1, 100, { dropdown: true, itemType: "service" });
          setOptions(items);
          addServiceFromId(id, items);
        } catch {
          // leave picker empty
        }
      }
    })();
  }, []);

  useQuickCreateReturn({
    restoreFormDraft: undefined,
    onReloadOptions: readOnly ? undefined : reloadOptions,
    onApplySelect: readOnly ? () => {} : applyQuickCreateSelect,
  });

  return (
    <div className="space-y-3">
      {!readOnly ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="w-full max-w-xs sm:w-72">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              {t("serviceItem")}
            </label>
            <CheckmarkSelect
              listLabel={t("serviceItem")}
              buttonAriaLabel={t("serviceItem")}
              options={selectOptions}
              value={pickId}
              disabled={saving}
              searchable
              className="w-full"
              onChange={setPickId}
              onAdd={itemQuickCreate.onAdd}
              addAriaLabel={itemQuickCreate.addAriaLabel}
              addLabel={itemQuickCreate.addLabel}
            />
          </div>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving || !pickId} onClick={addService}>
            {t("serviceAdd")}
          </AppButton>
        </div>
      ) : null}

      {services.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("serviceEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {services.map((row, index) => {
            const label =
              row.item_name?.trim() ||
              options.find((o) => o.id === row.item_id)?.name?.trim() ||
              (row.item_id != null ? `#${row.item_id}` : "—");
            return (
              <li
                key={row.id}
                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {label}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                      {formatMoneyDisplay(draftServiceLineTotal(row), loc)}
                    </span>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                        aria-label={t("serviceRemove")}
                        disabled={saving}
                        onClick={() => removeService(index)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("serviceCostPrice")}
                    </label>
                    <MoneyInput
                      value={String(row.cost_price)}
                      disabled={saving || readOnly}
                      className="w-full"
                      onChange={(e) => {
                        const cost = Number.parseFloat(e.target.value) || 0;
                        patchService(index, {
                          cost_price: cost,
                          selling_price: serviceLineSellPrice(cost, row.markup_percentage),
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("serviceMarkup")}
                    </label>
                    <NumericInput
                      value={String(row.markup_percentage)}
                      disabled={saving || readOnly}
                      maxDecimals={2}
                      trimTrailingZeros
                      variant="plain"
                      className={cn(surfaceInputClassName, "w-full")}
                      onChange={(v) => {
                        const markup = Number.parseFloat(v) || 0;
                        patchService(index, {
                          markup_percentage: markup,
                          selling_price: serviceLineSellPrice(row.cost_price, markup),
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("serviceSellPrice")}
                    </label>
                    <MoneyInput
                      value={String(row.selling_price)}
                      disabled={saving || readOnly}
                      className="w-full"
                      onChange={(e) => {
                        const sell = Number.parseFloat(e.target.value) || 0;
                        patchService(index, { selling_price: sell });
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {services.length > 0 ? (
        <QuotationDraftPriceTotalBar
          label={t("serviceTotal")}
          amount={servicesTotal}
          locale={loc}
          showMenuSpacer={false}
        />
      ) : null}
    </div>
  );
}
