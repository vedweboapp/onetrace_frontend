/**
 * Block scope detail (disabled). Routes under quotations/.../block redirect to Scope & Pricing.
 * Inline composite rows show qty, unit price, and total on the draft composer.
 */
"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { QuotationScopeBlock } from "@/features/quotations/types/quotation-block-scope.types";
import {
  blockLinesTotal,
  blockLinesToPerPinTableRows,
  readBlockScopeSession,
  writeBlockScopeSession,
} from "@/features/quotations/utils/quotation-block-scope.util";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import { EntityDetailLoadingSkeleton } from "@/shared/components/entity";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { DetailPagePadding } from "@/shared/components/layout/detail-metric-card";
import { normalizeQuotationScopeBackHref } from "@/features/quotations/utils/quotation-block-scope.util";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";
import { CheckmarkSelect, SurfaceShell } from "@/shared/ui";

type Props = {
  defaultBackHref: string;
};

export function QuotationBlockScopeDetailScreen({ defaultBackHref }: Props) {
  const t = useTranslations("Dashboard.quotations.blockScope");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const router = useRouter();
  const searchParams = useSearchParams();

  const blockKeyFromUrl = searchParams.get("block")?.trim() ?? "";
  const backHref = React.useMemo(() => {
    const fromQuery = searchParams.get("back");
    const fromSession = readBlockScopeSession()?.backHref;
    return normalizeQuotationScopeBackHref(
      fromQuery ?? fromSession,
      mergeUrlQueryParam(defaultBackHref, "tab", "pricing"),
    );
  }, [searchParams, defaultBackHref]);

  const [session, setSession] = React.useState(() => readBlockScopeSession());
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setSession(readBlockScopeSession());
    setReady(true);
  }, []);

  const activeKey = blockKeyFromUrl || session?.activeBlockKey || "";
  const activeBlock: QuotationScopeBlock | undefined = session?.blocks.find((b) => b.key === activeKey);

  const blockOptions = React.useMemo(
    () =>
      (session?.blocks ?? []).map((b) => ({
        value: b.key,
        label: b.blockName,
      })),
    [session?.blocks],
  );

  const tableRows = React.useMemo(
    () => (activeBlock ? blockLinesToPerPinTableRows(activeBlock.lines) : []),
    [activeBlock],
  );
  const plotTotal = activeBlock ? blockLinesTotal(activeBlock.lines) : 0;

  function onBlockChange(nextKey: string) {
    if (!session || !nextKey) return;
    const next = { ...session, activeBlockKey: nextKey };
    writeBlockScopeSession(next);
    setSession(next);
    const q = new URLSearchParams(searchParams.toString());
    q.set("block", nextKey);
    router.replace(`?${q.toString()}`);
  }

  if (!ready) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <DetailPageHeader
          title={t("missingTitle")}
          titleLoading
          backHref={backHref}
          backAriaLabel={t("backAria")}
        />
        <DetailPagePadding>
          <SurfaceShell>
            <EntityDetailLoadingSkeleton />
          </SurfaceShell>
        </DetailPagePadding>
      </div>
    );
  }

  if (!session || !activeBlock) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <DetailPageHeader title={t("missingTitle")} backHref={backHref} backAriaLabel={t("backAria")} />
        <DetailPagePadding>
          <SurfaceShell className="p-6 text-sm text-slate-500 dark:text-slate-400">{t("missingBody")}</SurfaceShell>
        </DetailPagePadding>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DetailPageHeader title={activeBlock.blockName} backHref={backHref} backAriaLabel={t("backAria")} />

      <DetailPagePadding className="flex-1">
        <div className="space-y-4">
          <div className="max-w-md">
            <CheckmarkSelect
              id="quotation-block-scope-picker"
              portaled
              listLabel={t("blockLabel")}
              options={blockOptions}
              value={activeKey}
              emptyLabel={t("blockLabel")}
              onChange={onBlockChange}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">
                  <th className="px-3 py-2.5 font-medium">{t("colProduct")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("colQty")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("colListPrice")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("colAmount")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("colDiscount")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("colTax")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("colTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      {t("emptyBlock")}
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row) => (
                    <tr
                      key={row.rowKey}
                      className="border-b border-slate-100 last:border-b-0 dark:border-slate-800"
                    >
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {row.name}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">
                        {row.quantity.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">
                        {formatMoneyDisplay(row.listPrice, loc)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[color:var(--dash-accent)]">
                        {formatMoneyDisplay(row.amount, loc)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[color:var(--dash-accent)]">
                        {formatMoneyDisplay(row.discount, loc)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[color:var(--dash-accent)]">
                        {formatMoneyDisplay(row.tax, loc)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[color:var(--dash-accent)]">
                        {formatMoneyDisplay(row.total, loc)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {tableRows.length > 0 ? (
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-950/40">
                    <td
                      colSpan={6}
                      className="px-3 py-3 text-right text-sm font-semibold text-slate-800 dark:text-slate-100"
                    >
                      {t("plotSubtotal")}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-[color:var(--dash-accent)]">
                      {formatMoneyDisplay(plotTotal, loc)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      </DetailPagePadding>
    </div>
  );
}
