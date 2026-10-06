"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchJob } from "@/features/jobs/api/job.api";
import type { Job } from "@/features/jobs/types/job.types";
import { JobSchedulingTab } from "@/features/jobs/components/job-scheduling-tab";
import { EntityDetailTabLoadingState } from "@/shared/components/entity";
import { detailTabStandaloneFillClassName } from "@/shared/components/layout/detail-tab-layout";
import { DashboardEmptyState } from "@/shared/ui";

type Props = {
  jobs: Job[];
};

/** Schedule for the quotation’s linked job — same panel as job detail Schedule (no job picker). */
export function QuotationScheduleTab({ jobs }: Props) {
  const t = useTranslations("Dashboard.quotations.relatedTabs");
  const linked = jobs[0] ?? null;
  const [detail, setDetail] = React.useState<Job | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [detailError, setDetailError] = React.useState(false);

  React.useEffect(() => {
    if (!linked) {
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
        const row = await fetchJob(linked.id, { silent: true });
        if (!cancelled) setDetail(row);
      } catch {
        if (!cancelled) {
          setDetail(linked);
          setDetailError(false);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linked]);

  if (!linked) {
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
      <JobSchedulingTab detail={detail} />
    </div>
  );
}
