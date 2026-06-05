"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MaterialRequestDetail } from "@/features/material-requests/types/material-request.types";
import { MaterialRequestStatusBadge } from "@/features/material-requests/components/material-request-status-badge";
import {
  formatMaterialRequestDispatchedLabel,
  materialRequestItemGroupName,
  materialRequestItemJobTitle,
  materialRequestItemPendingQty,
  materialRequestItemProductName,
  materialRequestItemRequestedQty,
  materialRequestItemRestockedQty,
  materialRequestJobProjectName,
  materialRequestJobTitle,
  materialRequestWorkerLabel,
} from "@/features/material-requests/utils/material-request-nested-fields.util";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  detail: MaterialRequestDetail;
  workerName?: string;
  dateFmt: Intl.DateTimeFormat;
  dueFmt: Intl.DateTimeFormat;
  statusLabel: string;
};

function pendingTone(pending: number, requested: number): string {
  if (pending <= 0) return "text-slate-500 dark:text-slate-400";
  if (pending >= requested) return "font-semibold text-red-600 dark:text-red-400";
  return "font-semibold text-amber-600 dark:text-amber-400";
}

export function MaterialRequestDetailBody({ detail, workerName, dateFmt, dueFmt, statusLabel }: Props) {
  const t = useTranslations("Dashboard.materialRequests");
  const extraItems = detail.extra_dispatch_items ?? [];
  const dispatchIds = detail.dispatch_ids ?? [];
  const showRestockedColumn = (detail.items ?? []).some((row) => materialRequestItemRestockedQty(row) > 0);

  return (
    <DetailPagePadding className="space-y-6">
      <DetailPanelCard title={t("detail.sectionOverview")}>
        <DetailMetricsGrid className="mb-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailMetricCard label={t("fields.workerName")}>
            {materialRequestWorkerLabel(detail.worker_name, workerName)}
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.status")}>
            <MaterialRequestStatusBadge status={detail.status} label={statusLabel} />
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.requestedDate")}>
            {formatFlexibleApiDate(detail.requested_date, dueFmt)}
          </DetailMetricCard>
        </DetailMetricsGrid>
      </DetailPanelCard>

      {dispatchIds.length > 0 ? (
        <DetailPanelCard title={t("detail.sectionDispatches")}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {dispatchIds.map((dispatchId) => (
              <li key={dispatchId} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`${routes.dashboard.dispatches}/${dispatchId}`}
                  className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
                >
                  {t("detail.dispatchLink", { id: `DSP-${String(dispatchId).padStart(5, "0")}` })}
                </Link>
              </li>
            ))}
          </ul>
        </DetailPanelCard>
      ) : null}

      <DetailPanelCard title={t("detail.sectionJobs")}>
        {(detail.jobs ?? []).length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("jobs.empty")}</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(detail.jobs ?? []).map((job) => (
              <div key={job.id} className="py-3 first:pt-0 last:pb-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{materialRequestJobTitle(job)}</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {materialRequestJobProjectName(job)}
                </p>
              </div>
            ))}
          </div>
        )}
      </DetailPanelCard>

      <DetailPanelCard title={t("detail.sectionItems")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                <th className="px-3 py-2">{t("lineItems.itemDetails")}</th>
                <th className="px-3 py-2">{t("lineItems.jobName")}</th>
                <th className="px-3 py-2 text-right">{t("dispatch.requested")}</th>
                <th className="px-3 py-2 text-right">{t("dispatch.dispatched")}</th>
                <th className="px-3 py-2 text-right">{t("dispatch.pending")}</th>
                {showRestockedColumn ? (
                  <th className="px-3 py-2 text-right">{t("restock.column")}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {(detail.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={showRestockedColumn ? 6 : 5} className="px-3 py-6 text-center text-slate-500">
                    {t("lineItems.empty")}
                  </td>
                </tr>
              ) : (
                (detail.items ?? []).map((row, index) => {
                  const product = row.item;
                  const groupName = materialRequestItemGroupName(row);
                  const sku =
                    product && typeof product === "object" && product.id > 0 ? `SKU: ${product.id}` : null;
                  const meta = [groupName !== "—" ? groupName : null, sku].filter(Boolean).join(" • ");
                  const requested = materialRequestItemRequestedQty(row);
                  const dispatchedLabel = formatMaterialRequestDispatchedLabel(row);
                  const pending = materialRequestItemPendingQty(row);
                  const restocked = materialRequestItemRestockedQty(row);
                  return (
                    <tr key={row.id ?? index} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {materialRequestItemProductName(row)}
                        </p>
                        {meta ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta}</p> : null}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                        {materialRequestItemJobTitle(row)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">
                        {requested.toFixed(0)} {t("lineItems.units")}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <span>{dispatchedLabel}</span>
                        <span className="text-slate-500 dark:text-slate-400"> {t("lineItems.units")}</span>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 text-right tabular-nums",
                          pendingTone(pending, requested),
                        )}
                      >
                        {pending <= 0 ? "—" : `${pending.toFixed(0)} ${t("lineItems.units")}`}
                      </td>
                      {showRestockedColumn ? (
                        <td className="px-3 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                          {restocked > 0 ? `${restocked.toFixed(0)} ${t("lineItems.units")}` : "—"}
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DetailPanelCard>

      {extraItems.length > 0 ? (
        <DetailPanelCard title={t("dispatch.sectionExtraSent")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <th className="pb-2 pr-3">{t("lineItems.itemDetails")}</th>
                  <th className="pb-2 text-right">{t("dispatch.dispatched")}</th>
                  <th className="pb-2 text-right">{t("fields.updatedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {extraItems.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 pr-3 font-medium text-slate-900 dark:text-slate-100">
                      {row.item_name?.trim() || `#${row.item}`}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {row.quantity.toFixed(0)} {t("lineItems.units")}
                    </td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {row.dispatched_at
                        ? formatFlexibleApiDate(row.dispatched_at, dateFmt)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailPanelCard>
      ) : null}

      {detail.notes?.trim() ? (
        <DetailPanelCard title={t("fields.notes")}>
          <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{detail.notes}</p>
        </DetailPanelCard>
      ) : null}

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
