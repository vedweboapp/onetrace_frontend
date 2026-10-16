"use client";

import * as React from "react";
import { Copy, Trash2 } from "lucide-react";
import type { QuotationDraftLine } from "@/features/quotations/types/quotation-draft.types";
import { aggregateDraftCompositeLines } from "@/features/quotations/utils/quotation-draft-composite-aggregate.util";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import { DataTableRowActionsMenu } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

function formatCompositeQty(qty: number): string {
  if (!Number.isFinite(qty) || qty < 0) return "0";
  const rounded = Math.round(qty * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export type CompositeLineLabels = {
  duplicateLine: string;
  removeLine: string;
  rowActions: string;
  unitPrice: string;
  lineTotal: string;
};

const PRICE_COL = "w-[6.5rem] shrink-0 text-right tabular-nums sm:w-28";
const MENU_COL = "w-8 shrink-0";

type Props = {
  pins: QuotationDraftLine[];
  saving: boolean;
  locale: string;
  emptyHint?: string;
  hideWhenEmpty?: boolean;
  labels: CompositeLineLabels;
  onDuplicateLine: (firstLineIndex: number) => void;
  onRemoveLines: (lineIndices: number[]) => void;
  onCompositeClick?: (args: {
    compositeItemId: number;
    repeatCount: number;
    displayName: string;
    lineIndices: number[];
  }) => void;
  readOnly?: boolean;
};

export function QuotationDraftCompositeLines({
  pins,
  saving,
  locale,
  emptyHint,
  hideWhenEmpty,
  labels,
  onDuplicateLine,
  onRemoveLines,
  onCompositeClick,
  readOnly = false,
}: Props) {
  const aggregated = React.useMemo(() => aggregateDraftCompositeLines(pins), [pins]);
  const showMenu = !readOnly;

  if (pins.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-3 py-3 dark:border-slate-600 dark:bg-slate-950/40">
        {emptyHint ? <p className="text-xs text-slate-500 dark:text-slate-400">{emptyHint}</p> : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50/70 dark:border-slate-600 dark:bg-slate-950/45">
      <div className="flex items-center gap-3 border-b border-slate-200/80 px-3 py-2 dark:border-slate-700/80">
        <div className="min-w-0 flex-1 text-xs font-medium text-slate-500 dark:text-slate-400" />
        <div className={cn(PRICE_COL, "text-[11px] font-medium text-slate-500 dark:text-slate-400")}>
          {labels.unitPrice}
        </div>
        <div className={cn(PRICE_COL, "text-[11px] font-medium text-slate-500 dark:text-slate-400")}>
          {labels.lineTotal}
        </div>
        {showMenu ? <div className={MENU_COL} aria-hidden /> : null}
      </div>
      <ul className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
        {aggregated.map((row) => {
          const firstIndex = row.lineIndices[0] ?? 0;
          const menuItems = showMenu
            ? [
                {
                  id: "dup-line",
                  label: labels.duplicateLine,
                  icon: Copy,
                  onSelect: () => onDuplicateLine(firstIndex),
                },
                {
                  id: "del-line",
                  label: labels.removeLine,
                  icon: Trash2,
                  tone: "danger" as const,
                  onSelect: () => onRemoveLines(row.lineIndices),
                },
              ]
            : [];

          return (
            <li
              key={row.key}
              className="flex items-center gap-3 bg-white px-3 py-2.5 dark:bg-slate-900/80 sm:py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                  {row.compositeItemId ? (
                    <button
                      type="button"
                      className="truncate text-left text-blue-600 underline-offset-2 hover:underline"
                      onClick={() =>
                        onCompositeClick?.({
                          compositeItemId: row.compositeItemId as number,
                          repeatCount: row.repeatCount,
                          displayName: row.displayName,
                          lineIndices: row.lineIndices,
                        })
                      }
                    >
                      {row.displayName}
                    </button>
                  ) : (
                    <span>{row.displayName}</span>
                  )}
                  {row.totalQty > 1 ? (
                    <span
                      className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      title={formatCompositeQty(row.totalQty)}
                    >
                      ×{formatCompositeQty(row.totalQty)}
                    </span>
                  ) : null}
                </p>
              </div>
              <div
                className={cn(PRICE_COL, "text-xs text-slate-500 dark:text-slate-400")}
                title={labels.unitPrice}
              >
                {row.unitPrice > 0 ? formatMoneyDisplay(row.unitPrice, locale) : "—"}
              </div>
              <div
                className={cn(PRICE_COL, "text-sm font-semibold text-[color:var(--dash-accent)]")}
                title={labels.lineTotal}
              >
                {formatMoneyDisplay(row.lineTotal, locale)}
              </div>
              {showMenu ? (
                <div data-draft-row-actions className={cn(MENU_COL, "flex justify-end")}>
                  {menuItems.length > 0 ? (
                    <DataTableRowActionsMenu
                      className="shrink-0"
                      menuAriaLabel={labels.rowActions}
                      items={menuItems}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Shared footer bar so materials / labour / section totals line up with price columns. */
export function QuotationDraftPriceTotalBar({
  label,
  amount,
  locale,
  className,
  showMenuSpacer = true,
}: {
  label: string;
  amount: number;
  locale: string;
  className?: string;
  showMenuSpacer?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
    >
      <div className="min-w-0 flex-1 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
        {label}
      </div>
      <div className={cn(PRICE_COL, "text-base font-semibold text-slate-900 dark:text-slate-50")}>
        {formatMoneyDisplay(amount, locale)}
      </div>
      {showMenuSpacer ? <div className={MENU_COL} aria-hidden /> : null}
    </div>
  );
}
