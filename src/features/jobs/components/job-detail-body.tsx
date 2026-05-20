"use client";

import { useTranslations } from "next-intl";
import type { Job } from "@/features/jobs/types/job.types";
import {
  getJobStatusRow,
  jobAssignedWorkerLabel,
} from "@/features/jobs/utils/job-nested-fields.util";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  DetailStatusMetric,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

export function JobDetailBody({
  detail,
  dateFmt,
  workerLabel,
}: {
  detail: Job;
  dateFmt: Intl.DateTimeFormat;
  workerLabel?: string;
}) {
  const t = useTranslations("Dashboard.jobs");
  const tMeta = useTranslations("Dashboard.common.detail");
  const statusRow = getJobStatusRow(detail);

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard>
          <DetailMetricsGrid>
            <DetailStatusMetric
              label={t("fields.recordStatus")}
              isActive={detail.is_active}
              activeLabel={t("status.active")}
              inactiveLabel={t("status.inactive")}
            />
            <DetailMetricCard label={t("fields.jobStatus")}>
              <WorkflowColourStatusChip
                row={statusRow}
                fallbackLabel={detail.job_pin_status?.trim() || t("detail.statusUnknown")}
              />
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.assignedWorker")}>
              {workerLabel ?? jobAssignedWorkerLabel(detail)}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.jobId")}>
              <span className="tabular-nums">{detail.id}</span>
            </DetailMetricCard>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionSchedule")}>
          <DetailMetricsGrid>
            <DetailMetricCard label={t("fields.startDate")}>
              {formatFlexibleApiDate(detail.start_date, dateFmt)}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.endDate")}>
              {formatFlexibleApiDate(detail.end_date, dateFmt)}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.completedAt")}>
              {detail.completed_at
                ? formatFlexibleApiDate(detail.completed_at, dateFmt)
                : t("detail.notCompleted")}
            </DetailMetricCard>
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
