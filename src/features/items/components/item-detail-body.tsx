"use client";

import type { Item } from "@/features/items/types/item.types";
import { cn } from "@/core/utils/http.util";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailSectionTitle,
  DetailWideCard,
} from "@/shared/components/layout/detail-metric-card";

export type ItemsTranslator = (
  key: string,
  values?: Record<string, string | number | boolean | null | undefined>,
) => string;

function moneyDisplay(v: unknown): string {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

export function ItemDetailBody({
  detail,
  dateFmt,
  t,
}: {
  detail: Item;
  dateFmt: Intl.DateTimeFormat;
  t: ItemsTranslator;
}) {
  return (
    <DetailPagePadding>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
            detail.is_composite
              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
          )}
        >
          {detail.is_composite ? t("detail.compositeYes") : t("detail.compositeNo")}
        </span>
      </div>

      <div className="space-y-3">
        <DetailSectionTitle>{t("detail.sectionOverview")}</DetailSectionTitle>
        <DetailMetricsGrid>
          <DetailMetricCard label={t("detail.sku")}>
            <span className="font-mono">{detail.sku?.trim() ? detail.sku : "—"}</span>
          </DetailMetricCard>
          <DetailMetricCard label={t("detail.quantity")}>
            <span className="tabular-nums">{detail.quantity ?? "—"}</span>
          </DetailMetricCard>
          <DetailMetricCard label={t("detail.reorder")}>
            <span className="tabular-nums">{detail.reorder_quantity ?? "—"}</span>
          </DetailMetricCard>
          <DetailMetricCard label={t("detail.cost")}>
            <span className="tabular-nums">{moneyDisplay(detail.cost_price)}</span>
          </DetailMetricCard>
          <DetailMetricCard label={t("detail.sell")}>
            <span className="tabular-nums">{moneyDisplay(detail.selling_price)}</span>
          </DetailMetricCard>
          <DetailMetricCard label={t("detail.itemType")}>
            {detail.is_composite ? t("detail.compositeYes") : t("detail.compositeNo")}
          </DetailMetricCard>
        </DetailMetricsGrid>
      </div>

      <div className="space-y-3">
        <DetailSectionTitle>{t("detail.sectionComponents")}</DetailSectionTitle>
        <DetailWideCard label={t("detail.components")}>
          {detail.components && detail.components.length > 0 ? (
            <div className="space-y-2">
              {detail.components.map((component, index) => (
                <div
                  key={`${component.child_item}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="text-sm">
                    {t("detail.componentItem")} #{component.child_item}
                  </span>
                  <span className="tabular-nums text-sm font-semibold">
                    {t("detail.componentQty")}: {component.quantity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.noComponents")}</p>
          )}
        </DetailWideCard>
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
        <DetailSectionTitle>{t("detail.sectionRecord")}</DetailSectionTitle>
        <DetailMetricsGrid>
          <DetailMetricCard label={t("detail.createdAt")}>
            <span className="tabular-nums">{dateFmt.format(new Date(detail.created_at))}</span>
          </DetailMetricCard>
          <DetailMetricCard label={t("detail.updatedAt")}>
            <span className="tabular-nums">{dateFmt.format(new Date(detail.modified_at))}</span>
          </DetailMetricCard>
          <DetailMetricCard label={t("detail.createdBy")}>
            {detail.created_by ? (
              <div className="space-y-1">
                <span className="block">{detail.created_by.username}</span>
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  {detail.created_by.email}
                </span>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">—</span>
            )}
          </DetailMetricCard>
          <DetailMetricCard label={t("detail.modifiedBy")}>
            {detail.modified_by ? (
              <div className="space-y-1">
                <span className="block">{detail.modified_by.username}</span>
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  {detail.modified_by.email}
                </span>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">—</span>
            )}
          </DetailMetricCard>
        </DetailMetricsGrid>
      </div>
    </DetailPagePadding>
  );
}
