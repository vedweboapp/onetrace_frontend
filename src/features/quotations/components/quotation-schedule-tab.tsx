"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchJob } from "@/features/jobs/api/job.api";
import type { Job } from "@/features/jobs/types/job.types";
import {
  getJobClientId,
  getJobProjectId,
} from "@/features/jobs/utils/job-nested-fields.util";
import { JobSchedulingTab } from "@/features/jobs/components/job-scheduling-tab";
import { SchedulingPanel } from "@/features/scheduling/components/scheduling-panel";
import { EntityDetailTabLoadingState } from "@/shared/components/entity";
import { detailTabStandaloneFillClassName } from "@/shared/components/layout/detail-tab-layout";
import { DashboardEmptyState } from "@/shared/ui";

type Props = {
  jobs: Job[];
};

/**
 * Quotation Schedule tab.
 * - 0 jobs: empty state
 * - 1 job (typical service quote): same as job detail — drag creates for that job
 * - Multiple jobs (project quote): scheduling page form on drag — pick which quote job to book
 */
export function QuotationScheduleTab({ jobs }: Props) {
  const t = useTranslations("Dashboard.quotations.relatedTabs");
  const multiJob = jobs.length > 1;
  const linked = jobs[0] ?? null;
  const [detail, setDetail] = React.useState<Job | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  React.useEffect(() => {
    if (!linked || multiJob) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const row = await fetchJob(linked.id, { silent: true });
        if (!cancelled) setDetail(row);
      } catch {
        if (!cancelled) setDetail(linked);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linked, multiJob]);

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

  if (multiJob) {
    const clientId =
      jobs.map((j) => getJobClientId(j.client)).find((id) => id != null && id > 0) ?? null;
    const projectId =
      jobs.map((j) => getJobProjectId(j.project)).find((id) => id != null && id > 0) ?? null;

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SchedulingPanel
          syncUrl={false}
          defaultClientId={clientId ?? undefined}
          defaultProjectId={projectId ?? undefined}
          allowedJobs={jobs}
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

  if (!detail) {
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
      <JobSchedulingTab detail={detail} />
    </div>
  );
}
