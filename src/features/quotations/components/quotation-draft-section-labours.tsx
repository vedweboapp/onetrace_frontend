"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fetchLabourTypesPage } from "@/features/labour-types/api/labour-type.api";
import type { LabourType } from "@/features/labour-types/types/labour-type.types";
import { parseLabourNumber, suggestedLabourSellPrice } from "@/features/labour-types/utils/labour-type-numbers.util";
import type { QuotationDraftLabour } from "@/features/quotations/types/quotation-draft.types";
import { draftLabourTotal } from "@/features/quotations/utils/quotation-draft-compute.util";
import { newQuotationDraftId } from "@/features/quotations/utils/quotation-draft-id.util";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import { labourLineSellPrice } from "@/features/quotations/utils/quotation-section-type.util";
import { AppButton, CheckmarkSelect, MoneyInput, NumericInput, surfaceInputClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  labours: QuotationDraftLabour[];
  readOnly?: boolean;
  saving?: boolean;
  onChange: (next: QuotationDraftLabour[]) => void;
};

export function QuotationDraftSectionLabours({ labours, readOnly = false, saving = false, onChange }: Props) {
  const t = useTranslations("Dashboard.quotations.draft");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const [options, setOptions] = React.useState<LabourType[]>([]);
  const [pickId, setPickId] = React.useState("");

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

  const selectOptions = React.useMemo(
    () => [
      { value: "", label: t("labourSelect") },
      ...options.map((row) => ({ value: String(row.id), label: row.name?.trim() || `#${row.id}` })),
    ],
    [options, t],
  );

  const labourTotal = labours.reduce((acc, row) => acc + draftLabourTotal(row), 0);

  function addLabour() {
    const id = Number.parseInt(pickId, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    const row = options.find((x) => x.id === id);
    if (!row) return;
    const cost = parseLabourNumber(row.default_cost_rate);
    const markup = parseLabourNumber(row.default_markup);
    const sell =
      parseLabourNumber(row.default_sell_price) || suggestedLabourSellPrice(cost, markup) || labourLineSellPrice(cost, markup);
    const hoursRaw = parseLabourNumber(row.default_time_hours);
    const hours = hoursRaw > 0 ? hoursRaw : 1;
    onChange([
      ...labours,
      {
        id: newQuotationDraftId("lab"),
        labour_type: id,
        labour_name: row.name?.trim() || null,
        time_hours: hours,
        cost_rate: cost,
        markup_percentage: markup,
        selling_price: sell,
      },
    ]);
    setPickId("");
  }

  function patchLabour(index: number, patch: Partial<QuotationDraftLabour>) {
    onChange(labours.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeLabour(index: number) {
    onChange(labours.filter((_, i) => i !== index));
  }

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
          {labours.map((row, index) => (
            <li
              key={row.id}
              className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {row.labour_name?.trim() || (row.labour_type != null ? `#${row.labour_type}` : "—")}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
                    {t("labourLineTotal")}: {formatMoneyDisplay(draftLabourTotal(row), loc)}
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
          ))}
        </ul>
      )}

      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
        {t("labourTotal")}: <span className="tabular-nums">{formatMoneyDisplay(labourTotal, loc)}</span>
      </p>
    </div>
  );
}
