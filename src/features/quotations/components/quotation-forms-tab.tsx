"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { fetchJob } from "@/features/jobs/api/job.api";
import { JobFormsTab } from "@/features/jobs/components/job-forms-tab";
import type { Job } from "@/features/jobs/types/job.types";
import {
  EntityDetailErrorState,
  EntityDetailTabLoadingState,
} from "@/shared/components/entity";
import { DetailTabListShell } from "@/shared/components/layout/detail-tab-list-shell";
import { ListPageEmptyStates } from "@/shared/ui";

type Props = {
  jobs: Job[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
};

/**
 * Service quotation Forms tab — same worker submissions list as the linked service job.
 * Loads a full job detail so form id resolution matches JobFormsTab on job detail.
 */
export function QuotationFormsTab({ jobs, loading, loadError, onRetry }: Props) {
  const t = useTranslations("Dashboard.quotations.relatedTabs");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const linked = jobs[0] ?? null;
  const [detail, setDetail] = React.useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  const backHref = React.useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "forms");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : `${pathname}?tab=forms`;
  }, [pathname, searchParams]);

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
            iconName: "forms",
            title: t("formsEmptyTitle"),
            description: t("formsEmptyDescription"),
          }}
          onClearFilters={() => {}}
        />
      }
      errorFallback={
        <EntityDetailErrorState
          fill
          message={loadError ?? detailError ?? t("formsLoadError")}
          retryLabel={t("retry")}
          onRetry={() => {
            onRetry();
            void reloadDetail();
          }}
        />
      }
    >
      {detail ? <JobFormsTab detail={detail} backHref={backHref} /> : null}
    </DetailTabListShell>
  );
}
