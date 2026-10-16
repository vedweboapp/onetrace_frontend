"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchJob } from "@/features/jobs/api/job.api";
import { JobDetailBody } from "@/features/jobs/components/job-detail-body";
import type { Job } from "@/features/jobs/types/job.types";
import {
  EntityDetailErrorState,
  EntityDetailTabLoadingState,
} from "@/shared/components/entity";
import { DetailTabListShell } from "@/shared/components/layout/detail-tab-list-shell";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { ListPageEmptyStates } from "@/shared/ui";

type Props = {
  jobs: Job[];
  loading: boolean;
  loadError: string | null;
  jobCategory: string;
  onRetry: () => void;
  onOpenSchedule?: () => void;
  onJobUpdated?: () => void;
};

/** Single linked job for a quotation — shows job detail (not a jobs table). */
export function QuotationJobsTab({
  jobs,
  loading,
  loadError,
  onRetry,
  onOpenSchedule,
  onJobUpdated,
}: Props) {
  const t = useTranslations("Dashboard.quotations.relatedTabs");
  const dateFmt = useDashboardDateFormat();
  const linked = jobs[0] ?? null;
  const [detail, setDetail] = React.useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  const reloadDetail = React.useCallback(async () => {
    if (!linked) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    try {
      const row = await fetchJob(linked.id, { silent: true });
      setDetail(row);
    } catch {
      setDetail(linked);
      setDetailError(null);
    } finally {
      setDetailLoading(false);
    }
  }, [linked]);

  React.useEffect(() => {
    void reloadDetail();
  }, [reloadDetail]);

  return (
    <DetailTabListShell
      loading={loading || (Boolean(linked) && detailLoading && !detail)}
      loadError={loadError ?? detailError}
      isEmpty={!loading && !loadError && !linked}
      loadingFallback={<EntityDetailTabLoadingState />}
      emptyFallback={
        <ListPageEmptyStates
          fill
          emptyStateKind="onboarding"
          onboarding={{
            iconName: "jobs",
            title: t("jobsEmptyTitle"),
            description: t("jobsEmptyDescription"),
          }}
          onClearFilters={() => {}}
        />
      }
      errorFallback={
        <EntityDetailErrorState
          fill
          message={loadError ?? detailError ?? t("jobsLoadError")}
          retryLabel={t("retry")}
          onRetry={() => {
            onRetry();
            void reloadDetail();
          }}
        />
      }
    >
      {detail ? (
        <JobDetailBody
          detail={detail}
          dateFmt={dateFmt}
          onOpenScheduling={onOpenSchedule}
          onSaved={() => {
            onJobUpdated?.();
            void reloadDetail();
          }}
          onChecklistsUpdated={() => void reloadDetail()}
        />
      ) : null}
    </DetailTabListShell>
  );
}
