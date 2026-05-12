"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ProjectLevelForQuotation } from "@/features/quotations/types/quotation.types";
import {
  aggregateCompositeLinesForPlot,
  formatMoneyDisplay,
  isLevelIncluded,
  levelCompositeTotal,
  plotCompositeTotal,
} from "@/features/quotations/utils/quotation-level-pricing.util";
import { AppButton, surfaceInputClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  sortedLevelRows: ProjectLevelForQuotation[];
  selectAllLevels: boolean;
  levelIds: number[];
  saving: boolean;
  canShowLevels: boolean;
  newLevelName: string;
  onNewLevelNameChange: (v: string) => void;
  creatingLevel: boolean;
  onCreateLevel: () => void | Promise<void>;
  onSelectAllLevelsChange: (checked: boolean) => void;
  onToggleLevel: (levelId: number, include: boolean) => void;
  newLevelPlaceholder: string;
  createLevelLabel: string;
};

export function QuotationSectionsPricing({
  sortedLevelRows,
  selectAllLevels,
  levelIds,
  saving,
  canShowLevels,
  newLevelName,
  onNewLevelNameChange,
  creatingLevel,
  onCreateLevel,
  onSelectAllLevelsChange,
  onToggleLevel,
  newLevelPlaceholder,
  createLevelLabel,
}: Props) {
  const t = useTranslations("Dashboard.quotations.levels");
  const tHints = useTranslations("Dashboard.quotations.hints");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";

  let grandTotal = 0;
  for (const lv of sortedLevelRows) {
    if (isLevelIncluded(selectAllLevels, levelIds, lv.id)) {
      grandTotal += levelCompositeTotal(lv);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-800 dark:text-slate-100">
          <input
            type="checkbox"
            className="mt-1"
            checked={selectAllLevels}
            disabled={saving || !canShowLevels}
            onChange={(e) => onSelectAllLevelsChange(e.target.checked)}
          />
          <span>{t("selectAllSections")}</span>
        </label>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={newLevelName}
            onChange={(e) => onNewLevelNameChange(e.target.value)}
            placeholder={newLevelPlaceholder}
            className={cn(surfaceInputClassName, "sm:w-72")}
            disabled={saving || creatingLevel || !canShowLevels}
          />
          <AppButton
            type="button"
            variant="secondary"
            size="md"
            disabled={saving || creatingLevel || !canShowLevels || newLevelName.trim().length === 0}
            loading={creatingLevel}
            onClick={() => void onCreateLevel()}
          >
            {createLevelLabel}
          </AppButton>
        </div>
      </div>

      {!canShowLevels ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("selectProjectHint")}</p> : null}

      {canShowLevels && sortedLevelRows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{tHints("noLevels")}</p>
      ) : null}

      {canShowLevels && sortedLevelRows.length > 0 ? (
        <div className="mt-4 space-y-4">
          {sortedLevelRows.map((lv) => {
            const included = isLevelIncluded(selectAllLevels, levelIds, lv.id);
            const sectionTotal = levelCompositeTotal(lv);
            const plots = Array.isArray(lv.plots) ? lv.plots : [];

            return (
              <div
                key={lv.id}
                className={cn(
                  "rounded-lg border p-3 sm:p-4",
                  included ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" : "border-slate-100 bg-slate-50/60 opacity-90 dark:border-slate-800 dark:bg-slate-950/40",
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 shrink-0"
                      checked={included}
                      disabled={saving || selectAllLevels}
                      onChange={(e) => onToggleLevel(lv.id, e.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{lv.name ?? `#${lv.id}`}</span>
                      {selectAllLevels ? (
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{t("includedViaSelectAll")}</span>
                      ) : null}
                    </span>
                  </label>
                </div>

                {included && plots.length > 0 ? (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {plots.map((plot) => {
                      const lines = aggregateCompositeLinesForPlot(plot);
                      const plotTotal = plotCompositeTotal(plot);
                      return (
                        <details key={plot.id} className="group rounded-md border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30">
                          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-slate-800 marker:content-none dark:text-slate-100 [&::-webkit-details-marker]:hidden">
                            <span className="inline-flex w-full items-start justify-between gap-2">
                              <span className="min-w-0 flex-1 leading-snug">{plot.name?.trim() || `#${plot.id}`}</span>
                              <span className="shrink-0 tabular-nums text-xs font-normal text-slate-500 dark:text-slate-400">
                                {t("plotSubtotal")}: {formatMoneyDisplay(plotTotal, loc)}
                              </span>
                            </span>
                          </summary>
                          <div className="border-t border-slate-100 px-3 pb-3 pt-2 dark:border-slate-800">
                            {lines.length === 0 ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{t("plotEmptyPins")}</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[280px] text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                      <th className="py-1.5 pr-2 font-medium">{t("colItem")}</th>
                                      <th className="py-1.5 pr-2 font-medium">{t("colQty")}</th>
                                      <th className="py-1.5 pr-2 font-medium">{t("colUnit")}</th>
                                      <th className="py-1.5 font-medium">{t("colLine")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lines.map((line) => (
                                      <tr key={line.key} className="border-b border-slate-100 dark:border-slate-800/80">
                                        <td className="py-1.5 pr-2 font-medium text-slate-800 dark:text-slate-100">{line.displayName}</td>
                                        <td className="py-1.5 pr-2 tabular-nums text-slate-700 dark:text-slate-200">{line.totalQty}</td>
                                        <td className="py-1.5 pr-2 tabular-nums text-slate-600 dark:text-slate-300">
                                          {formatMoneyDisplay(line.unitPrice, loc)}
                                        </td>
                                        <td className="py-1.5 tabular-nums font-medium text-slate-800 dark:text-slate-100">
                                          {formatMoneyDisplay(line.lineTotal, loc)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="text-slate-700 dark:text-slate-200">
                                      <td colSpan={3} className="pt-2 text-right text-xs font-semibold">
                                        {t("plotSubtotal")}
                                      </td>
                                      <td className="pt-2 text-xs font-semibold tabular-nums">{formatMoneyDisplay(plotTotal, loc)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                ) : null}

                {included && plots.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("noPlotsInSection")}</p>
                ) : null}

                {included ? (
                  <div className="mt-3 flex justify-end border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-50">
                    <span>
                      {t("sectionTotal")}: <span className="tabular-nums">{formatMoneyDisplay(sectionTotal, loc)}</span>
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="flex justify-end rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-50">
            <span>
              {t("grandTotal")}: <span className="tabular-nums">{formatMoneyDisplay(grandTotal, loc)}</span>
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
