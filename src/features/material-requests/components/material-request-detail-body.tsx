"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { MaterialRequestDetail } from "@/features/material-requests/types/material-request.types";
import { MaterialRequestStatusBadge } from "@/features/material-requests/components/material-request-status-badge";
import {
  materialRequestDispatchRows,
  materialRequestItemGroupName,
  materialRequestItemJobTitle,
  materialRequestItemProductName,
  materialRequestItemRequestedQty,
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
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  detail: MaterialRequestDetail;
  workerName?: string;
  dateFmt: Intl.DateTimeFormat;
  dueFmt: Intl.DateTimeFormat;
  statusLabel: string;
  activeTab: "overview" | "dispatch" | "timeline";
};

function pendingTone(pending: number, requested: number): string {
  if (pending <= 0) return "text-slate-500 dark:text-slate-400";
  if (pending >= requested) return "font-semibold text-red-600 dark:text-red-400";
  return "font-semibold text-amber-600 dark:text-amber-400";
}

export function MaterialRequestDetailBody({
  detail,
  workerName,
  dateFmt,
  dueFmt,
  statusLabel,
  activeTab,
}: Props) {
  const t = useTranslations("Dashboard.materialRequests");
  const dispatchRows = materialRequestDispatchRows(detail.items);
  const timeline = detail.timeline ?? [];

  return (
    <DetailPagePadding className="space-y-6">
      {activeTab === "overview" ? (
        <>
          <DetailPanelCard title={t("detail.sectionOverview")}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <DetailMetricsGrid className="flex-1 sm:grid-cols-2">
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
            </div>
          </DetailPanelCard>

          <DetailPanelCard title={t("detail.sectionJobs")}>
            {(detail.jobs ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("jobs.empty")}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(detail.jobs ?? []).map((job) => (
                  <div key={job.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {materialRequestJobTitle(job)}
                    </p>
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
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                    <th className="pb-2 pr-3">{t("lineItems.itemDetails")}</th>
                    <th className="pb-2 pr-3">{t("lineItems.jobName")}</th>
                    <th className="pb-2 text-right">{t("lineItems.requestQty")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500">
                        {t("lineItems.empty")}
                      </td>
                    </tr>
                  ) : (
                    (detail.items ?? []).map((row, index) => {
                      const product = row.item;
                      const groupName = materialRequestItemGroupName(row);
                      const sku =
                        product && typeof product === "object" && product.id > 0
                          ? `SKU: ${product.id}`
                          : null;
                      const meta = [groupName !== "—" ? groupName : null, sku].filter(Boolean).join(" • ");
                      return (
                        <tr key={row.id ?? index} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-3 pr-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {materialRequestItemProductName(row)}
                            </p>
                            {meta ? (
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta}</p>
                            ) : null}
                          </td>
                          <td className="py-3 pr-3 text-slate-600 dark:text-slate-400">
                            {materialRequestItemJobTitle(row)}
                          </td>
                          <td className="py-3 text-right tabular-nums font-semibold">
                            {materialRequestItemRequestedQty(row).toFixed(0)} {t("lineItems.units")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </DetailPanelCard>

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
        </>
      ) : activeTab === "dispatch" ? (
        <DetailPanelCard title={t("detail.sectionDispatch")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                  <th className="px-3 py-2">{t("dispatch.materialItem")}</th>
                  <th className="px-3 py-2 text-right">{t("dispatch.requested")}</th>
                  <th className="px-3 py-2 text-right">{t("dispatch.dispatched")}</th>
                  <th className="px-3 py-2 text-right">{t("dispatch.pending")}</th>
                </tr>
              </thead>
              <tbody>
                {dispatchRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      {t("dispatch.empty")}
                    </td>
                  </tr>
                ) : (
                  dispatchRows.map((row) => (
                    <tr key={row.key} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{row.materialName}</p>
                        {row.groupName !== "—" ? (
                          <p className="mt-0.5 text-xs text-slate-500">{row.groupName}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {row.requested.toFixed(0)} {t("lineItems.units")}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {row.dispatched.toFixed(0)} {t("lineItems.units")}
                      </td>
                      <td className={cn("px-3 py-3 text-right tabular-nums", pendingTone(row.pending, row.requested))}>
                        {row.pending <= 0 ? "—" : `${row.pending.toFixed(0)} ${t("lineItems.units")}`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DetailPanelCard>
      ) : (
        <DetailPanelCard title={t("detail.sectionTimeline")}>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("timeline.empty")}</p>
          ) : (
            <ol className="relative space-y-6 border-l border-slate-200 pl-6 dark:border-slate-700">
              {timeline.map((entry, index) => (
                <li key={String(entry.id ?? index)} className="relative">
                  <span className="absolute -left-[1.625rem] top-1.5 size-2.5 rounded-full bg-slate-900 dark:bg-slate-100" />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {entry.title?.trim() || t("timeline.event")}
                    </p>
                    {entry.occurred_at ? (
                      <p className="text-xs text-slate-500">
                        {formatFlexibleApiDate(entry.occurred_at, dateFmt)}
                      </p>
                    ) : null}
                  </div>
                  {entry.description?.trim() ? (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{entry.description}</p>
                  ) : null}
                  {entry.tag?.trim() ? (
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {entry.tag}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </DetailPanelCard>
      )}
    </DetailPagePadding>
  );
}
