"use client";

import type { Group } from "@/features/groups/types/group.types";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailSectionTitle,
  DetailWideCard,
} from "@/shared/components/layout/detail-metric-card";

export type GroupsTranslator = (
  key: string,
  values?: Record<string, string | number | boolean | null | undefined>,
) => string;

export function GroupDetailBody({
  detail,
  dateFmt,
  t,
}: {
  detail: Group;
  dateFmt: Intl.DateTimeFormat;
  t: GroupsTranslator;
}) {
  return (
    <DetailPagePadding>
      <div className="space-y-3">
        <DetailSectionTitle>{t("detail.sectionItems")}</DetailSectionTitle>
        <DetailWideCard label={t("detail.items")}>
          {detail.items && detail.items.length > 0 ? (
            <div className="space-y-2">
              {detail.items.map((entry, index) => (
                <div
                  key={`${entry.id ?? index}-${entry.item}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="text-sm">{entry.item_name ?? `#${entry.item}`}</span>
                  <span className="rounded bg-slate-200 px-2 py-1 text-xs font-semibold dark:bg-slate-800">
                    {entry.abbreviation || "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.noItems")}</p>
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
