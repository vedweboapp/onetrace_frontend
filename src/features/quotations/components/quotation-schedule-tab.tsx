"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchJob } from "@/features/jobs/api/job.api";
import type { Job } from "@/features/jobs/types/job.types";
import { JobSchedulingTab } from "@/features/jobs/components/job-scheduling-tab";
import { EntityDetailTabLoadingState } from "@/shared/components/entity";
import { detailTabStandaloneFillClassName } from "@/shared/components/layout/detail-tab-layout";
import { CheckmarkSelect, DashboardEmptyState } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  jobs: Job[];
};

export function QuotationScheduleTab({ jobs }: Props) {
  const t = useTranslations("Dashboard.quotations.relatedTabs");
  const [jobId, setJobId] = React.useState(() => (jobs[0] ? String(jobs[0].id) : ""));
  const [detail, setDetail] = React.useState<Job | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [detailError, setDetailError] = React.useState(false);

  React.useEffect(() => {
    if (jobs.length === 0) {
      setJobId("");
      return;
    }
    if (!jobs.some((job) => String(job.id) === jobId)) {
      setJobId(String(jobs[0]!.id));
    }
  }, [jobs, jobId]);

  const selectedId = React.useMemo(() => {
    const n = Number.parseInt(jobId, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [jobId]);

  React.useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      setDetailError(false);
      setLoadingDetail(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      setDetailError(false);
      try {
        const row = await fetchJob(selectedId, { silent: true });
        if (!cancelled) setDetail(row);
      } catch {
        if (!cancelled) {
          const fallback = jobs.find((job) => job.id === selectedId) ?? null;
          setDetail(fallback);
          setDetailError(fallback == null);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, jobs]);

  if (jobs.length === 0) {
    return (
      <div className={detailTabStandaloneFillClassName}>
        <DashboardEmptyState
          fill
          iconName="scheduling"
          title={t("scheduleEmptyTitle")}
          description={t("scheduleEmptyDescription")}
        />
      </div>
    );
  }

  if (loadingDetail && !detail) {
    return (
      <div className={detailTabStandaloneFillClassName}>
        <EntityDetailTabLoadingState />
      </div>
    );
  }

  if (!detail || detailError) {
    return (
      <div className={detailTabStandaloneFillClassName}>
        <DashboardEmptyState
          fill
          iconName="error"
          title={t("scheduleEmptyTitle")}
          description={t("scheduleEmptyDescription")}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {jobs.length > 1 ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-1 py-2 dark:border-slate-800">
          <span className="text-sm text-slate-500 dark:text-slate-400">{t("scheduleJob")}</span>
          <CheckmarkSelect
            listLabel={t("scheduleJob")}
            buttonAriaLabel={t("scheduleJob")}
            options={jobs.map((job) => ({
              value: String(job.id),
              label: job.job_serial_number?.trim() || job.title?.trim() || `#${job.id}`,
            }))}
            value={jobId}
            className={cn("w-full max-w-xs")}
            onChange={(value) => setJobId(value ?? "")}
          />
        </div>
      ) : null}
      <JobSchedulingTab detail={detail} />
    </div>
  );
}
