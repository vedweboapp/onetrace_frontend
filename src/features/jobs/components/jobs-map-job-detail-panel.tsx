"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchJob } from "@/features/jobs/api/job.api";
import { JobDetailBody } from "@/features/jobs/components/job-detail-body";
import type { Job } from "@/features/jobs/types/job.types";
import { getJobStatusRow, jobClientLabel } from "@/features/jobs/utils/job-nested-fields.util";
import {
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
} from "@/shared/components/entity";
import { DetailPagePadding } from "@/shared/components/layout/detail-metric-card";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { AppButton, DetailPanel } from "@/shared/ui";

type Props = {
  jobId: number | null;
  onClose: () => void;
  onOpenJob: (jobId: number) => void;
};

export function JobsMapJobDetailPanel({ jobId, onClose, onOpenJob }: Props) {
  const t = useTranslations("Dashboard.jobs.mapView");
  const tActions = useTranslations("Dashboard.common.actions");
  const dateFmt = useDashboardDateFormat({ dateOnly: true });

  const [detail, setDetail] = React.useState<Job | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (jobId == null) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const job = await fetchJob(jobId);
        if (!cancelled) {
          setDetail(job);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setError(getApiErrorDisplayMessage(err, t("loadDetailError")));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, reloadKey, t]);

  const open = jobId != null;
  const statusRow = detail ? getJobStatusRow(detail) : null;
  const serial = detail?.job_serial_number?.trim();
  const title =
    detail?.title?.trim() ||
    serial ||
    (jobId != null ? `${t("jobId")} #${jobId}` : t("panelTitle"));
  const subtitleParts: React.ReactNode[] = [];
  if (serial && detail?.title?.trim() && serial !== detail.title.trim()) {
    subtitleParts.push(
      <span key="serial" className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {serial}
      </span>,
    );
  }
  if (detail) {
    const client = jobClientLabel(detail.client);
    if (client && client !== "—") {
      subtitleParts.push(
        <span key="client" className="text-xs text-slate-500 dark:text-slate-400">
          {client}
        </span>,
      );
    }
  }
  if (statusRow) {
    subtitleParts.push(
      <span key="status" className="inline-flex">
        <WorkflowColourStatusChip row={statusRow} />
      </span>,
    );
  }

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      widthClassName="sm:max-w-2xl lg:max-w-3xl"
      isBusy={loading}
      title={title}
      subtitle={
        subtitleParts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">{subtitleParts}</div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("panelSubtitle")}</p>
        )
      }
      footer={
        jobId != null ? (
          <AppButton
            type="button"
            className="w-full sm:w-auto"
            onClick={() => onOpenJob(jobId)}
            disabled={loading}
          >
            <span className="inline-flex items-center gap-1.5">
              {t("openJob")}
              <ExternalLink className="size-3.5" strokeWidth={2} aria-hidden />
            </span>
          </AppButton>
        ) : null
      }
    >
      {loading ? (
        <EntityDetailLoadingSkeleton />
      ) : error ? (
        <EntityDetailErrorState
          message={error}
          retryLabel={tActions("retry")}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : detail ? (
        <DetailPagePadding className="!px-0 !pb-2">
          <JobDetailBody
            detail={detail}
            dateFmt={dateFmt}
            onSaved={() => setReloadKey((k) => k + 1)}
            onChecklistsUpdated={() => setReloadKey((k) => k + 1)}
            onOpenScheduling={() => onOpenJob(detail.id)}
          />
        </DetailPagePadding>
      ) : null}
    </DetailPanel>
  );
}
