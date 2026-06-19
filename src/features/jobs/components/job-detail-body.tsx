"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Job } from "@/features/jobs/types/job.types";
import { JobFormsSection } from "@/features/job-forms/components/job-forms-section";
import { JobChecklistsSection } from "@/features/jobs/components/job-checklists-section";
import {
  getJobStatusRow,
  jobAssignedWorkerLabel,
  jobChecklistEntries,
  jobChecklistIsMarked,
  jobClientLabel,
  jobFormEntries,
  jobProjectLabel,
  jobSiteLabel,
} from "@/features/jobs/utils/job-nested-fields.util";
import {
  normalizeJobMeta,
  resolveJobMetaCompositeItemId,
} from "@/features/jobs/utils/job-meta-payload.util";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import {
  DetailLinkedTable,
  DetailLinkedTableRow,
  DetailLinkedTableTd,
  detailLinkedTableCellClassName,
} from "@/shared/components/layout/detail-linked-table";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

export function JobDetailBody({
  detail,
  dateFmt,
  workerLabel,
  onChecklistsUpdated,
}: {
  detail: Job;
  dateFmt: Intl.DateTimeFormat;
  workerLabel?: string;
  onChecklistsUpdated?: () => void;
}) {
  const t = useTranslations("Dashboard.jobs");
  const tMeta = useTranslations("Dashboard.common.detail");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const statusRow = getJobStatusRow(detail);
  const meta = normalizeJobMeta(detail.job_meta);
  const compositeRows = meta?.composite_items ?? [];
  const formEntries = jobFormEntries(detail);
  const checklistEntries = jobChecklistEntries(detail);
  const checklistMarked = jobChecklistIsMarked(detail);

  const [compositeNameById, setCompositeNameById] = React.useState<Map<number, string>>(new Map());

  React.useEffect(() => {
    if (compositeRows.length === 0) {
      setCompositeNameById(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchItemsPage(1, 500, { isActive: true });
        if (cancelled) return;
        const map = new Map<number, string>();
        for (const item of items) {
          map.set(item.id, item.name?.trim() || item.sku?.trim() || `#${item.id}`);
        }
        setCompositeNameById(map);
      } catch {
        if (!cancelled) setCompositeNameById(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compositeRows.length]);

  function compositeItemId(row: (typeof compositeRows)[number]): number | null {
    return resolveJobMetaCompositeItemId(row);
  }

  const clientId = detail.client && typeof detail.client === "object" ? detail.client.id : typeof detail.client === "number" ? detail.client : null;
  const projectId =
    detail.project && typeof detail.project === "object" ? detail.project.id : typeof detail.project === "number" ? detail.project : null;
  const siteId = detail.site && typeof detail.site === "object" ? detail.site.id : typeof detail.site === "number" ? detail.site : null;

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("sections.basic")}>
          <DetailMetricsGrid>
            <DetailMetricCard label={t("fields.jobStatus")}>
              <WorkflowColourStatusChip
                row={statusRow}
                fallbackLabel={detail.job_pin_status?.trim() || t("detail.statusUnknown")}
              />
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.assignedWorker")}>
              {workerLabel ?? jobAssignedWorkerLabel(detail)}
            </DetailMetricCard>
            {/* <DetailMetricCard label={t("fields.jobId")}>
              <span className="tabular-nums">{detail.id}</span>
            </DetailMetricCard> */}
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionRelations")}>
          <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-3">
            <DetailMetricCard label={t("fields.client")}>
              {clientId != null ? (
                <Link
                  href={`${routes.dashboard.clients}/${clientId}`}
                  className="font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {jobClientLabel(detail.client)}
                </Link>
              ) : (
                "—"
              )}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.project")}>
              {projectId != null ? (
                <Link
                  href={`${routes.dashboard.projects}/${projectId}`}
                  className="font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {jobProjectLabel(detail.project)}
                </Link>
              ) : (
                "—"
              )}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.site")}>
              {siteId != null ? (
                <Link
                  href={`${routes.dashboard.sites}/${siteId}`}
                  className="font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {jobSiteLabel(detail.site)}
                </Link>
              ) : (
                "—"
              )}
            </DetailMetricCard>
          </DetailMetricsGrid>
          <JobFormsSection
            jobId={detail.id}
            forms={formEntries}
            checklists={checklistEntries}
            checklistMarked={checklistMarked}
            backHref={`${routes.dashboard.jobs}/${detail.id}`}
            onChecklistsUpdated={onChecklistsUpdated}
          />
        </DetailPanelCard>

        <JobChecklistsSection checklists={checklistEntries} />

        {meta && (meta.total != null || compositeRows.length > 0) ? (
          <DetailPanelCard title={t("detail.sectionWorkScope")}>
           
            {compositeRows.length > 0 ? (
              <div className="mt-3">
                <DetailLinkedTable
                  columns={[
                    { id: "name", header: t("detail.colCompositeItem"), widthClass: "w-[34%]" },
                    { id: "qty", header: t("fields.compositeQuantity"), narrow: true, align: "right", widthClass: "w-[14%]" },
                    // { id: "unit", header: t("detail.colUnitPrice"), narrow: true, align: "right", widthClass: "w-[18%]" },
                    // { id: "line", header: t("detail.colLineTotal"), narrow: true, align: "right", widthClass: "w-[18%]" },
                  ]}
                >
                  {compositeRows.map((row, index) => {
                    // const unit =
                    //   row.amount != null &&
                    //   Number.isFinite(row.amount) &&
                    //   row.quantity > 0
                    //     ? row.amount / row.quantity
                    //     : typeof row.selling_price === "number" && Number.isFinite(row.selling_price)
                    //       ? row.selling_price
                    //       : row.item &&
                    //           typeof row.item === "object" &&
                    //           typeof row.item.selling_price === "number" &&
                    //           Number.isFinite(row.item.selling_price)
                    //         ? row.item.selling_price
                    //         : 0;
                    // const lineTotal =
                    //   row.amount != null && Number.isFinite(row.amount)
                    //     ? row.amount
                    //     : unit > 0
                    //       ? unit * row.quantity
                    //       : 0;
                    const itemId = compositeItemId(row);
                    const name =
                      row.name?.trim() ||
                      (row.item && typeof row.item === "object" && row.item.name?.trim()) ||
                      (itemId != null ? compositeNameById.get(itemId) : undefined) ||
                      (itemId != null ? `#${itemId}` : "—");
                    return (
                      <DetailLinkedTableRow key={`${itemId ?? "row"}-${index}`} index={index}>
                        <DetailLinkedTableTd
                          className={detailLinkedTableCellClassName({
                            cellClassName: "font-medium text-slate-900 dark:text-slate-100",
                          })}
                        >
                          {itemId != null ? (
                            <Link
                              href={`${routes.dashboard.items}/${itemId}`}
                              className="text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                        </DetailLinkedTableTd>
                        <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                        >
                          {row.quantity}
                        </DetailLinkedTableTd>
                        {/* <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                        >
                          {unit > 0 ? formatMoneyDisplay(unit, loc) : "—"}
                        </DetailLinkedTableTd>
                        <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({
                            align: "right",
                            narrow: true,
                            cellClassName: "tabular-nums font-medium",
                          })}
                        >
                          {lineTotal > 0 ? formatMoneyDisplay(lineTotal, loc) : "—"}
                        </DetailLinkedTableTd> */}
                      </DetailLinkedTableRow>
                    );
                  })}
                </DetailLinkedTable>
              </div>
            ) : null}
          </DetailPanelCard>
        ) : null}

        {detail.qr_code?.qr_image ? (
          <DetailPanelCard title={t("detail.sectionQrCode")}>
            <DetailMetricsGrid>
              {detail.qr_code.qr_code_id ? (
                <DetailMetricCard label={t("detail.qrCodeId")}>
                  <span className="font-mono text-sm">{detail.qr_code.qr_code_id}</span>
                </DetailMetricCard>
              ) : null}
            </DetailMetricsGrid>
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detail.qr_code.qr_image}
                alt={detail.qr_code.qr_code_id ?? t("detail.sectionQrCode")}
                className="size-40 rounded-lg border border-slate-200 bg-white object-contain p-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </DetailPanelCard>
        ) : null}

        <DetailPanelCard title={t("detail.sectionSchedule")}>
          <DetailMetricsGrid>
            <DetailMetricCard label={t("fields.startDate")}>
              {formatFlexibleApiDate(detail.start_date, dateFmt)}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.endDate")}>
              {formatFlexibleApiDate(detail.end_date, dateFmt)}
            </DetailMetricCard>
            {/* <DetailMetricCard label={t("fields.completedAt")}>
              {detail.completed_at
                ? formatFlexibleApiDate(detail.completed_at, dateFmt)
                : t("detail.notCompleted")}
            </DetailMetricCard> */}
            {detail.job_pin_status ? (
              <DetailMetricCard label={t("fields.pinStatus")}>
                <span className="capitalize">{detail.job_pin_status}</span>
              </DetailMetricCard>
            ) : null}
          </DetailMetricsGrid>
        </DetailPanelCard>

        {detail.description?.trim() ? (
          <DetailPanelCard title={t("detail.sectionDescription")}>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{detail.description}</p>
          </DetailPanelCard>
        ) : null}

        <DetailSystemMetadataSection
          createdAt={detail.created_at}
          modifiedAt={detail.modified_at}
          dateFmt={dateFmt}
          createdBy={detail.created_by}
          modifiedBy={detail.modified_by}
          labels={{
            sectionTitle: tMeta("systemMetadata"),
            createdAt: t("fields.createdAt"),
            updatedAt: t("fields.updatedAt"),
            createdBy: t("fields.createdBy"),
            modifiedBy: tMeta("modifiedBy"),
            notModifiedYet: tMeta("notModifiedYet"),
          }}
        />
      </div>
    </DetailPagePadding>
  );
}
