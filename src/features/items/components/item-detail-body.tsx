"use client";

import { useTranslations } from "next-intl";
import type { Item } from "@/features/items/types/item.types";
import { cn } from "@/core/utils/http.util";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";

function moneyDisplay(v: unknown): string {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

export function ItemDetailBody({
  detail,
  dateFmt,
}: {
  detail: Item;
  dateFmt: Intl.DateTimeFormat;
}) {
  const t = useTranslations("Dashboard.items");

  return (
    <DetailPagePadding>
      <DetailPanelCard title={t("detail.sectionOverview")}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
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
      </DetailPanelCard>

      {detail.is_composite ? (
        <DetailPanelCard title={t("detail.sectionComponents")}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
            {t("detail.components")}
          </p>
          {detail.components && detail.components.length > 0 ? (
            <div className="max-w-xl space-y-2">
              {detail.components.map((component, index) => (
                <div
                  key={`${component.child_item}-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {t("detail.componentItem")} #{component.child_item}
                  </span>
                  <span className="shrink-0 rounded-md bg-slate-200/90 px-2 py-1 text-xs font-semibold tabular-nums text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                    {t("detail.componentQty")} {component.quantity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.noComponents")}</p>
          )}
        </DetailPanelCard>
      ) : null}

      <DetailPanelCard title={t("detail.sectionRecord")}>
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
      </DetailPanelCard>
    </DetailPagePadding>
  );
}
