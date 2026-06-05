"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { DispatchStatusBadge } from "@/features/dispatches/components/dispatch-status-badge";
import type { DispatchDetail } from "@/features/dispatches/types/dispatch.types";
import { dispatchWorkerLabel, normalizeDispatchStatus } from "@/features/dispatches/utils/dispatch-display.util";
import { DispatchedQuantityCell } from "@/shared/components/quantity/dispatched-quantity-cell";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  detail: DispatchDetail;
  dateFmt: Intl.DateTimeFormat;
  dueFmt: Intl.DateTimeFormat;
  statusLabel: string;
};

export function DispatchDetailBody({ detail, dateFmt, dueFmt, statusLabel }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DetailPagePadding className="space-y-6">
      <DetailPanelCard title={t("detail.sectionOverview")}>
        <div className="mb-4 flex justify-end">
          <DispatchStatusBadge status={detail.status} label={statusLabel} />
        </div>
        <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-3">
          <DetailMetricCard label={t("fields.dispatchTo")}>
            {detail.dispatch_to?.trim() || dispatchWorkerLabel(detail.worker_name)}
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.dispatchDate")}>
            {formatFlexibleApiDate(detail.dispatch_date, dueFmt)}
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.materialRequest")}>
            {detail.material_request_id > 0 ? (
              <Link
                href={`${routes.dashboard.materialRequests}/${detail.material_request_id}`}
                className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
              >
                {detail.material_request_number?.trim() || `#${detail.material_request_id}`}
              </Link>
            ) : (
              "—"
            )}
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.jobName")}>{detail.job_name?.trim() || "—"}</DetailMetricCard>
        </DetailMetricsGrid>
      </DetailPanelCard>

      <DetailPanelCard title={t("detail.sectionItems")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                <th className="px-3 py-2">{t("table.materialItem")}</th>
                <th className="px-3 py-2">{t("table.jobName")}</th>
                <th className="px-3 py-2">{t("table.workerName")}</th>
                <th className="px-3 py-2 text-right">{t("table.requested")}</th>
                <th className="px-3 py-2 text-right">{t("table.pending")}</th>
                <th className="px-3 py-2 text-right">{t("table.dispatched")}</th>
                <th className="px-3 py-2 text-right">{t("table.restocked")}</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    {t("detail.noItems")}
                  </td>
                </tr>
              ) : (
                detail.lines.map((row) => {
                  const fulfilled = Math.max(0, row.dispatched_quantity - row.extra_quantity);
                  const lineHref = `${pathname}/lines/${row.id}?back=${encodeURIComponent(pathname)}`;
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/40"
                      onClick={() => router.push(lineHref)}
                    >
                      <td className="px-3 py-3">
                        <Link
                          href={lineHref}
                          className="font-medium text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.item.name?.trim() || `#${row.item.id}`}
                        </Link>
                        {row.is_extra ? (
                          <span className="mt-1 block text-xs font-medium text-amber-600 dark:text-amber-400">
                            {t("detail.extraItem")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                        {row.job?.title?.trim() || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                        {dispatchWorkerLabel(row.worker_name ?? detail.worker_name)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.requested_quantity.toFixed(0)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.pending_quantity.toFixed(0)}</td>
                      <td className="px-3 py-3 text-right">
                        <DispatchedQuantityCell
                          fulfilled={fulfilled}
                          surplus={row.extra_quantity}
                          unitsLabel={t("units")}
                        />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {row.restocked_quantity > 0 ? row.restocked_quantity.toFixed(0) : "—"}
                      </td>
                    </tr>
                  );
                })
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
    </DetailPagePadding>
  );
}

export function dispatchStatusLabel(
  t: (key: string) => string,
  status: string | null | undefined,
): string {
  const norm = normalizeDispatchStatus(status);
  if (norm === "dispatched") return t("status.dispatched");
  if (norm === "delivered") return t("status.delivered");
  if (norm === "in_transit") return t("status.inTransit");
  if (norm === "processing") return t("status.processing");
  if (norm === "draft") return t("status.draft");
  if (norm === "delayed") return t("status.delayed");
  return status?.trim() || "—";
}
