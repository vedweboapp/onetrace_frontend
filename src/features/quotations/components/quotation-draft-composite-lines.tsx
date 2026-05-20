"use client";

import * as React from "react";
import { Copy, Trash2 } from "lucide-react";
import type { QuotationDraftLine } from "@/features/quotations/types/quotation-draft.types";
import { aggregateDraftCompositeLines } from "@/features/quotations/utils/quotation-draft-composite-aggregate.util";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import { DataTableRowActionsMenu } from "@/shared/ui";

function formatCompositeQty(qty: number): string {
  if (!Number.isFinite(qty) || qty < 0) return "0";
  const rounded = Math.round(qty * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export type CompositeLineLabels = {
  duplicateLine: string;
  removeLine: string;
  rowActions: string;
};

type Props = {
  pins: QuotationDraftLine[];
  saving: boolean;
  locale: string;
  emptyHint?: string;
  hideWhenEmpty?: boolean;
  labels: CompositeLineLabels;
  onDuplicateLine: (firstLineIndex: number) => void;
  onRemoveLines: (lineIndices: number[]) => void;
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
  readOnly = false,
}: Props) {
  const aggregated = React.useMemo(() => aggregateDraftCompositeLines(pins), [pins]);

  if (pins.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-3 py-3 dark:border-slate-600 dark:bg-slate-950/40">
        {emptyHint ? <p className="text-xs text-slate-500 dark:text-slate-400">{emptyHint}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-2 dark:border-slate-600 dark:bg-slate-950/45">
      <ul className="space-y-1.5">
        {aggregated.map((row) => {
          const firstIndex = row.lineIndices[0] ?? 0;
          const menuItems = !readOnly
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
              className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 sm:py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                  <span>{row.displayName}</span>
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
              <div className="ml-auto flex items-center justify-end gap-3">
                <span className="min-w-[5.5rem] shrink-0 text-right text-sm font-semibold tabular-nums text-[color:var(--dash-accent)] sm:min-w-[6rem]">
                  {formatMoneyDisplay(row.lineTotal, locale)}
                </span>
                {menuItems.length > 0 ? (
                  <div data-draft-row-actions>
                    <DataTableRowActionsMenu
                      className="shrink-0"
                      menuAriaLabel={labels.rowActions}
                      items={menuItems}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
