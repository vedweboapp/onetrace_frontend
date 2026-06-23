"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { DetailEntityLink } from "@/shared/components/entity";
import { ReturnRequestStatusBadge } from "@/features/dispatches/components/return-request-status-badge";
import type { DispatchReturnRequest } from "@/features/dispatches/types/dispatch.types";
import { dispatchReturnWorkerLabel } from "@/features/dispatches/utils/dispatch-return.util";
import { returnRequestStatusLabel } from "@/features/dispatches/utils/return-request-list.util";
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
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  detail: DispatchReturnRequest;
  dueFmt: Intl.DateTimeFormat;
};

export function ReturnToStockDetailBody({ detail, dueFmt }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const statusLabel = returnRequestStatusLabel(t, detail.status);

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("return.detail.sectionOverview")}>
          <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-3">
            <DetailMetricCard label={t("table.workerName")}>
              {dispatchReturnWorkerLabel(detail.worker_name)}
            </DetailMetricCard>
            <DetailMetricCard label={t("return.detail.requestNumber")}>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {detail.request_number}
              </span>
            </DetailMetricCard>
            <DetailMetricCard label={t("table.status")}>
              <ReturnRequestStatusBadge status={detail.status} label={statusLabel} />
            </DetailMetricCard>
            <DetailMetricCard label={t("return.detail.requestedAt")}>
              {formatFlexibleApiDate(detail.requested_at, dueFmt)}
            </DetailMetricCard>
            {detail.completed_at ? (
              <DetailMetricCard label={t("return.detail.returnedAt")}>
                {formatFlexibleApiDate(detail.completed_at, dueFmt)}
              </DetailMetricCard>
            ) : null}
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("return.detail.sectionItems")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                  <th className="px-3 py-2">{t("table.materialItem")}</th>
                  <th className="px-3 py-2">{t("table.dispatchId")}</th>
                  <th className={quantityTableHeaderClass}>{t("return.returnQty")}</th>
                  <th className="px-3 py-2">{t("return.returnType")}</th>
                  <th className="px-3 py-2">{t("return.reason")}</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((line, index) => (
                  <tr
                    key={`${line.dispatch_id}-${line.line_id}-${index}`}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {line.item_name?.trim() || `#${line.item_id}`}
                    </td>
                    <td className="px-3 py-3">
                      <DetailEntityLink
                        href={`${routes.dashboard.dispatches}/${line.dispatch_id}`}
                        className="font-medium text-slate-800 underline-offset-2 hover:underline dark:text-slate-200"
                      >
                        {line.dispatch_number}
                      </DetailEntityLink>
                    </td>
                    <td className={quantityTableCellClass}>
                      <QuantityWithUnits value={line.quantity} unitsLabel={t("units")} />
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                      {line.return_type === "faulty" ? t("return.typeFaulty") : t("return.typeUnused")}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                      {line.reason?.trim() || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailPanelCard>
      </div>
    </DetailPagePadding>
  );
}
