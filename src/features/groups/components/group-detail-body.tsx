"use client";

import { useTranslations } from "next-intl";
import type { Group } from "@/features/groups/types/group.types";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";

export function GroupDetailBody({
  detail,
  dateFmt,
}: {
  detail: Group;
  dateFmt: Intl.DateTimeFormat;
}) {
  const t = useTranslations("Dashboard.groups");
  return (
    <DetailPagePadding>
      <DetailPanelCard title={t("detail.sectionItems")}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
          {t("detail.items")}
        </p>
        {detail.items && detail.items.length > 0 ? (
          <div className="max-w-xl space-y-2">
            {detail.items.map((entry, index) => (
              <div
                key={`${entry.id ?? index}-${entry.item}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                  {entry.item_name ?? `#${entry.item}`}
                </span>
                <span className="shrink-0 rounded-md bg-slate-200/90 px-2 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                  {entry.abbreviation || "—"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.noItems")}</p>
        )}
      </DetailPanelCard>

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
