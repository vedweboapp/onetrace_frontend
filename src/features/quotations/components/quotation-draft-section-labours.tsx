"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fetchLabourType, fetchLabourTypesPage } from "@/features/labour-types/api/labour-type.api";
import type { LabourType } from "@/features/labour-types/types/labour-type.types";
import { parseLabourNumber, suggestedLabourSellPrice } from "@/features/labour-types/utils/labour-type-numbers.util";
import type { QuotationDraftLabour } from "@/features/quotations/types/quotation-draft.types";
import { QuotationDraftPriceTotalBar } from "@/features/quotations/components/quotation-draft-composite-lines";
import { draftLabourTotal } from "@/features/quotations/utils/quotation-draft-compute.util";
import { newQuotationDraftId } from "@/features/quotations/utils/quotation-draft-id.util";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import { labourLineSellPrice } from "@/features/quotations/utils/quotation-section-type.util";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn, type QuickCreateSelectApplied } from "@/shared/hooks/use-quick-create-return";
import { AppButton, CheckmarkSelect, MoneyInput, NumericInput, surfaceInputClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  labours: QuotationDraftLabour[];
  readOnly?: boolean;
  saving?: boolean;
  onChange: (next: QuotationDraftLabour[]) => void;
  /** Persist parent section draft before navigating to quick-create. */
  getFormDraft?: () => unknown;
};

function labourFromType(row: LabourType): QuotationDraftLabour {
  const cost = parseLabourNumber(row.default_cost_rate);
  const markup = parseLabourNumber(row.default_markup);
  const sell =
    parseLabourNumber(row.default_sell_price) || suggestedLabourSellPrice(cost, markup) || labourLineSellPrice(cost, markup);
  const hoursRaw = parseLabourNumber(row.default_time_hours);
  const hours = hoursRaw > 0 ? hoursRaw : 1;
  return {
    id: newQuotationDraftId("lab"),
    labour_type: row.id,
    labour_name: row.name?.trim() || null,
    time_hours: hours,
    cost_rate: cost,
    markup_percentage: markup,
    selling_price: sell,
  };
}

export function QuotationDraftSectionLabours({
  labours,
  readOnly = false,
  saving = false,
  onChange,
  getFormDraft,
}: Props) {
  const t = useTranslations("Dashboard.quotations.draft");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const [options, setOptions] = React.useState<LabourType[]>([]);
  const [pickId, setPickId] = React.useState("");
  const laboursRef = React.useRef(labours);
  laboursRef.current = labours;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const reloadOptions = React.useCallback(async () => {
    try {
      const { items } = await fetchLabourTypesPage(1, 100, { dropdown: true });
      setOptions(items);
    } catch {
      setOptions([]);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchLabourTypesPage(1, 100, { dropdown: true });
        if (!cancelled) setOptions(items);
      } catch {
        if (!cancelled) setOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const usedTypeIds = React.useMemo(() => {
    const ids = new Set<number>();
    for (const row of labours) {
      if (row.labour_type != null && row.labour_type > 0) ids.add(row.labour_type);
    }
    return ids;
  }, [labours]);

  const selectOptions = React.useMemo(
    () => [
      { value: "", label: t("labourSelect") },
      ...options
        .filter((row) => !usedTypeIds.has(row.id))
        .map((row) => ({ value: String(row.id), label: row.name?.trim() || `#${row.id}` })),
    ],
    [options, t, usedTypeIds],
  );

  const labourTotal = labours.reduce((acc, row) => acc + draftLabourTotal(row), 0);

  function addLabourFromId(id: number, catalog: LabourType[] = options) {
    if (!Number.isFinite(id) || id <= 0) return false;
    if (laboursRef.current.some((row) => row.labour_type === id)) return false;
    const row = catalog.find((x) => x.id === id);
    if (!row) return false;
    onChangeRef.current([...laboursRef.current, labourFromType(row)]);
    setPickId("");
    return true;
  }

  function addLabour() {
    const id = Number.parseInt(pickId, 10);
    addLabourFromId(id);
  }

  function patchLabour(index: number, patch: Partial<QuotationDraftLabour>) {
    onChange(labours.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeLabour(index: number) {
    onChange(labours.filter((_, i) => i !== index));
  }

  const labourQuickCreate = useQuickCreate({
    kind: "labour",
    addDisabled: readOnly || saving,
    getFormDraft: readOnly ? undefined : getFormDraft,
  });

  const applyQuickCreateSelect = React.useCallback(({ selectTarget, selectId }: QuickCreateSelectApplied) => {
    if (selectTarget !== "labour") return;
    const id = Number.parseInt(selectId, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    void (async () => {
      try {
        const row = await fetchLabourType(id);
        setOptions((prev) => [...prev.filter((x) => x.id !== row.id), row]);
        addLabourFromId(id, [row]);
      } catch {
        try {
          const { items } = await fetchLabourTypesPage(1, 100, { dropdown: true });
          setOptions(items);
          addLabourFromId(id, items);
        } catch {
          // leave picker empty; options reload may still help on next open
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
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("labourType")}</label>
            <CheckmarkSelect
              listLabel={t("labourType")}
              buttonAriaLabel={t("labourType")}
              options={selectOptions}
              value={pickId}
              disabled={saving}
              searchable
              className="w-full"
              onChange={setPickId}
              onAdd={labourQuickCreate.onAdd}
              addAriaLabel={labourQuickCreate.addAriaLabel}
              addLabel={labourQuickCreate.addLabel}
            />
          </div>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving || !pickId} onClick={addLabour}>
            {t("labourAdd")}
          </AppButton>
        </div>
      ) : null}

      {labours.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("labourEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {labours.map((row, index) => {
            const label =
              row.labour_name?.trim() ||
              options.find((o) => o.id === row.labour_type)?.name?.trim() ||
              (row.labour_type != null ? `#${row.labour_type}` : "—");
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
                      {formatMoneyDisplay(draftLabourTotal(row), loc)}
                    </span>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                        aria-label={t("labourRemove")}
                        disabled={saving}
                        onClick={() => removeLabour(index)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("labourCostRate")}
                    </label>
                    <MoneyInput
                      value={String(row.cost_rate)}
                      disabled={saving || readOnly}
                      className="w-full"
                      onChange={(e) => {
                        const cost = Number.parseFloat(e.target.value) || 0;
                        patchLabour(index, {
                          cost_rate: cost,
                          selling_price: labourLineSellPrice(cost, row.markup_percentage),
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("labourSellPrice")}
                    </label>
                    <MoneyInput
                      value={String(row.selling_price)}
                      disabled={saving || readOnly}
                      className="w-full"
                      onChange={(e) => {
                        const sell = Number.parseFloat(e.target.value) || 0;
                        patchLabour(index, { selling_price: sell });
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("labourMarkup")}
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
                        patchLabour(index, {
                          markup_percentage: markup,
                          selling_price: labourLineSellPrice(row.cost_rate, markup),
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("labourTimeHours")}
                    </label>
                    <NumericInput
                      value={String(row.time_hours)}
                      disabled={saving || readOnly}
                      maxDecimals={2}
                      trimTrailingZeros
                      variant="plain"
                      className={cn(surfaceInputClassName, "w-full")}
                      onChange={(v) => {
                        const n = Number.parseFloat(v);
                        patchLabour(index, { time_hours: Number.isFinite(n) && n >= 0 ? n : 0 });
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {labours.length > 0 ? (
        <QuotationDraftPriceTotalBar
          label={t("labourTotal")}
          amount={labourTotal}
          locale={loc}
          showMenuSpacer={false}
        />
      ) : null}
    </div>
  );
}
