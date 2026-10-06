"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Job } from "@/features/jobs/types/job.types";
import {
  getJobAssignedWorkerRows,
  getJobStatusId,
  getJobStatusRow,
} from "@/features/jobs/utils/job-nested-fields.util";
import { JOB_CATEGORY } from "@/features/jobs/constants/job-category";
import {
  EntityDataTable,
  EntityDetailErrorState,
  EntityDetailTabLoadingState,
  EntityLabelOverflowGroup,
  entityCol,
  entityNameLinkClassName,
} from "@/shared/components/entity";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { DetailTabListShell } from "@/shared/components/layout/detail-tab-list-shell";
import {
  detailTabBodyClassName,
  detailTabSectionClassName,
} from "@/shared/components/layout/detail-tab-layout";
import { routes } from "@/shared/config/routes";
import { ListPageEmptyStates, SurfaceShell } from "@/shared/ui";
import {
  buildDetailHrefWithListReturn,
  mergeUrlQueryParam,
} from "@/shared/utils/detail-from-list.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  jobs: Job[];
  loading: boolean;
  loadError: string | null;
  jobCategory: string;
  onRetry: () => void;
};

/** Project-quote jobs list — table of jobs for this quotation (`quotation_id` API). */
export function QuotationJobsTableTab({ jobs, loading, loadError, jobCategory, onRetry }: Props) {
  const t = useTranslations("Dashboard.quotations.relatedTabs");
  const tJobs = useTranslations("Dashboard.jobs");
  const router = useRouter();
  const pathname = usePathname();

  const listBack = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set("tab", "jobs");
    return `${pathname}?${params.toString()}`;
  }, [pathname]);

  const openJobDetail = React.useCallback(
    (id: number) => {
      const detailPath = mergeUrlQueryParam(
        `${routes.dashboard.jobs}/${id}`,
        "job_category",
        jobCategory || JOB_CATEGORY.project,
      );
      router.push(buildDetailHrefWithListReturn(detailPath, listBack, id));
    },
    [jobCategory, listBack, router],
  );

  const columns = React.useMemo(() => {
    const c = entityCol<Job>();
    return [
      c.custom("title", tJobs("table.title"), (row) => {
        const serial = row.job_serial_number?.trim() || null;
        return (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className={`truncate font-semibold ${entityNameLinkClassName}`}>{row.title}</span>
            {serial ? (
              <span className="truncate text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                {serial}
              </span>
            ) : null}
          </span>
        );
      }),
      c.custom("worker", tJobs("table.assignedWorker"), (row) => {
        const workers = getJobAssignedWorkerRows(row);
        if (workers.length === 0) return <span className="text-sm text-slate-500">—</span>;
        return (
          <EntityLabelOverflowGroup
            items={workers.map((worker) => ({
              id: worker.id,
              label: worker.label,
              href: `${routes.dashboard.settingsUsers}/${worker.id}`,
            }))}
          />
        );
      }),
      c.custom("jobStatus", tJobs("table.jobStatus"), (row) => {
        const expanded = getJobStatusRow(row);
        if (expanded) return <WorkflowColourStatusChip row={expanded} />;
        const id = getJobStatusId(row);
        if (row.job_pin_status?.trim()) {
          return (
            <span className="text-sm capitalize text-slate-600 dark:text-slate-400">{row.job_pin_status}</span>
          );
        }
        if (id != null) return <span className="text-sm text-slate-500">#{id}</span>;
        return <span className="text-sm text-slate-500">—</span>;
      }),
    ];
  }, [tJobs]);

  return (
    <DetailTabListShell
      loading={loading}
      loadError={loadError}
      isEmpty={!loading && !loadError && jobs.length === 0}
      loadingFallback={<EntityDetailTabLoadingState />}
      emptyFallback={
        <ListPageEmptyStates
          fill
          emptyStateKind="onboarding"
          onboarding={{
            iconName: "jobs",
            title: t("jobsTableEmptyTitle"),
            description: t("jobsTableEmptyDescription"),
          }}
          onClearFilters={() => {}}
        />
      }
      errorFallback={
        <EntityDetailErrorState
          fill
          message={loadError ?? t("jobsLoadError")}
          retryLabel={t("retry")}
          onRetry={onRetry}
        />
      }
    >
      <div className={cn(detailTabSectionClassName, "min-h-0 flex-1")}>
        <SurfaceShell className={cn(detailTabBodyClassName, "min-h-0 flex-1 overflow-auto p-0")}>
          <EntityDataTable
            columns={columns}
            rows={jobs}
            rowHighlightId={(row) => row.id}
            onRowClick={(row) => openJobDetail(row.id)}
            emptyMessage={t("jobsTableEmptyTitle")}
            fillHeight
          />
        </SurfaceShell>
      </div>
    </DetailTabListShell>
  );
}
