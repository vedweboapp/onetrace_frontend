"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailUserAttribution, normalizeDetailAuditUser } from "@/shared/components/entity/entity-detail-fields";
import type { DispatchDetail, DispatchLineSummary } from "@/features/dispatches/types/dispatch.types";
import { dispatchWorkerLabel } from "@/features/dispatches/utils/dispatch-display.util";
import { DispatchedQuantityCell } from "@/shared/components/quantity/dispatched-quantity-cell";
import {
  quantityTableCellClass,
  quantityTableHeaderClass,
  QuantityWithUnits,
} from "@/shared/components/quantity/quantity-table-columns";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  detail: DispatchDetail;
  dateFmt: Intl.DateTimeFormat;
  dueFmt: Intl.DateTimeFormat;
};

function lineRowsFromDetail(detail: DispatchDetail): DispatchLineSummary[] {
  if (detail.line_summaries?.length) return detail.line_summaries;
  return detail.lines.map((line) => ({
    group_key: line.is_extra ? `extra:item:${line.item.id}` : `item:${line.item.id}`,
    item_id: line.item.id,
    item_name: line.item.name?.trim() || "—",
    is_extra: line.is_extra,
    requested_quantity: line.requested_quantity,
    pending_quantity: line.pending_quantity,
    dispatched_quantity: line.dispatched_quantity,
    fulfilled_quantity: Math.max(0, line.dispatched_quantity - line.extra_quantity),
    surplus_quantity: line.extra_quantity,
    restocked_quantity: line.restocked_quantity,
  }));
}

export function DispatchDetailBody({ detail, dateFmt, dueFmt }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const lineRows = React.useMemo(() => lineRowsFromDetail(detail), [detail]);

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
      <DetailPanelCard title={t("detail.sectionOverview")}>
        <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-3">
          <DetailMetricCard label={t("fields.dispatchId")}>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {detail.dispatch_number}
            </span>
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.dispatchTo")}>
            {detail.dispatch_to?.trim() || dispatchWorkerLabel(detail.worker_name)}
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.dispatchedBy")}>
            <DetailUserAttribution
              user={normalizeDetailAuditUser(detail.dispatched_by ?? detail.created_by)}
              emptyLabel="—"
            />
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.dispatchDate")}>
            {formatFlexibleApiDate(detail.dispatch_date, dueFmt)}
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.materialRequest")}>
            {detail.material_request_id > 0 ? (
              <DetailEntityLink
                href={`${routes.dashboard.materialRequests}/${detail.material_request_id}`}
                className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
              >
                {detail.material_request_number?.trim() || t("fields.materialRequest")}
              </DetailEntityLink>
            ) : (
              "—"
            )}
          </DetailMetricCard>
        </DetailMetricsGrid>
      </DetailPanelCard>

      <DetailPanelCard title={t("detail.sectionItems")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                <th className="px-3 py-2">{t("table.materialItem")}</th>
                <th className={quantityTableHeaderClass}>{t("table.requested")}</th>
                <th className={quantityTableHeaderClass}>{t("table.pending")}</th>
                <th className={quantityTableHeaderClass}>{t("table.dispatched")}</th>
              </tr>
            </thead>
            <tbody>
              {lineRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    {t("detail.noItems")}
                  </td>
                </tr>
              ) : (
                lineRows.map((row) => (
                  <tr key={row.group_key} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-3">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{row.item_name}</span>
                      {row.is_extra ? (
                        <span className="mt-1 block text-xs font-medium text-amber-600 dark:text-amber-400">
                          {t("detail.extraItem")}
                        </span>
                      ) : null}
                    </td>
                    <td className={cn(quantityTableCellClass, "font-medium")}>
                      <QuantityWithUnits value={row.requested_quantity} unitsLabel={t("units")} />
                    </td>
                    <td className={quantityTableCellClass}>
                      <QuantityWithUnits value={row.pending_quantity} unitsLabel={t("units")} />
                    </td>
                    <td className={quantityTableCellClass}>
                      <DispatchedQuantityCell
                        fulfilled={row.fulfilled_quantity}
                        surplus={row.surplus_quantity}
                        unitsLabel={t("units")}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DetailPanelCard>

      <DetailSystemMetadataSection
        createdAt={detail.created_at ?? new Date().toISOString()}
        modifiedAt={detail.modified_at}
        dateFmt={dateFmt}
        createdBy={detail.created_by}
        modifiedBy={detail.modified_by}
        labels={{
          sectionTitle: t("detail.sectionSystemMetadata"),
          createdAt: t("fields.createdAt"),
          updatedAt: t("fields.updatedAt"),
          createdBy: t("fields.createdBy"),
          modifiedBy: t("fields.modifiedBy"),
          notModifiedYet: t("detail.notModifiedYet"),
        }}
      />
      </div>
    </DetailPagePadding>
  );
}
