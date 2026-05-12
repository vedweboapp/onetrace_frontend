"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import type { QuotationQuoteSection } from "@/features/quotations/types/quotation.types";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  sections: QuotationQuoteSection[];
  grandTotal?: number | null;
  className?: string;
};

export function QuotationQuoteSectionsSummary({ sections, grandTotal, className }: Props) {
  const t = useTranslations("Dashboard.quotations");
  const locale = useLocale();

  const sorted = React.useMemo(
    () => [...sections].sort((a, b) => a.section_order - b.section_order),
    [sections],
  );

  const scopeGrandTotal = React.useMemo(() => {
    if (grandTotal != null && Number.isFinite(grandTotal)) return grandTotal;
    if (!sorted.length) return null;
    return sorted.reduce(
      (acc, s) => acc + (typeof s.section_total === "number" && Number.isFinite(s.section_total) ? s.section_total : 0),
      0,
    );
  }, [grandTotal, sorted]);

  return (
    <div
      className={cn(
        "max-h-[min(28rem,55vh)] space-y-4 overflow-y-auto pr-1 text-sm",
        className,
      )}
    >
      {sorted.map((section, sectionIndex) => (
        <div
          key={`quote-summary-section-${sectionIndex}-${section.section_order ?? "o"}-${section.level_id ?? "l"}-${String(section.name ?? "")}`}
          className="rounded-lg border border-slate-200/90 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/35"
        >
          <div className="font-semibold text-slate-900 dark:text-slate-100">{section.name}</div>
          <div className="mt-2 space-y-3">
            {[...(Array.isArray(section.plots) ? section.plots : [])]
              .sort((a, b) => a.plot_order - b.plot_order)
              .map((plot, plotIndex) => (
                <div
                  key={`quote-summary-section-${sectionIndex}-plot-${plotIndex}-${plot.plot_order ?? "o"}-${plot.plot_id ?? "id"}-${String(plot.name ?? "")}`}
                  className="border-l-2 border-slate-300 pl-3 dark:border-slate-600"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {plot.name}
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {[...(Array.isArray(plot.lines) ? plot.lines : [])]
                      .sort((a, b) => a.line_order - b.line_order)
                      .map((line, lineIndex) => (
                        <li
                          key={`quote-summary-section-${sectionIndex}-plot-${plotIndex}-line-${lineIndex}-${line.line_order ?? "o"}-${String(line.name ?? "")}`}
                          className="flex flex-wrap items-baseline justify-between gap-2 text-slate-800 dark:text-slate-200"
                        >
                          <span className="min-w-0 flex-1">
                            {line.name}
                            <span className="ml-1.5 tabular-nums text-slate-500 dark:text-slate-400">
                              ×{line.quantity} @ {formatMoneyDisplay(line.unit_price, locale)}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums font-medium">
                            {formatMoneyDisplay(line.line_total, locale)}
                          </span>
                        </li>
                      ))}
                  </ul>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {t("draft.plotSubtotal")}:{" "}
                    <span className="tabular-nums font-medium text-slate-800 dark:text-slate-200">
                      {formatMoneyDisplay(plot.plot_total, locale)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-2 border-t border-slate-200/80 pt-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
            {t("draft.sectionTotal")}:{" "}
            <span className="tabular-nums">{formatMoneyDisplay(section.section_total, locale)}</span>
          </div>
        </div>
      ))}
      {scopeGrandTotal != null && Number.isFinite(scopeGrandTotal) ? (
        <div className="flex justify-end border-t border-slate-200/80 pt-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
          <span>
            {t("draft.grandTotal")}: <span className="tabular-nums">{formatMoneyDisplay(scopeGrandTotal, locale)}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
