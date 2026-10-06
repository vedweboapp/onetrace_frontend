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
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { entityCol, EntityDataTable, EntityDetailErrorState, EntityDetailTabLoadingState, EntityLabelOverflowGroup } from "@/shared/components/entity";
import { DetailTabListShell, DetailTabTableBody } from "@/shared/components/layout/detail-tab-list-shell";
import {
  detailTabSectionClassName,
  detailTabStandaloneFillClassName,
  detailTabTitleClassName,
} from "@/shared/components/layout/detail-tab-layout";
import { routes } from "@/shared/config/routes";
import { ListPageEmptyStates } from "@/shared/ui";
import { buildDetailHrefWithListReturn, mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";

type Props = {
  jobs: Job[];
  loading: boolean;
  loadError: string | null;
  jobCategory: string;
  onRetry: () => void;
};

export function QuotationJobsTab({ jobs, loading, loadError, jobCategory, onRetry }: Props) {
  const t = useTranslations("Dashboard.quotations.relatedTabs");
  const tJobs = useTranslations("Dashboard.jobs");
  const router = useRouter();
  const pathname = usePathname();

  const columns = React.useMemo(() => {
    const c = entityCol<Job>();
    return [
      c.custom("title", tJobs("table.title"), (row) => {
        const serial = row.job_serial_number?.trim() || null;
        return (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-semibold">{row.title?.trim() || "—"}</span>
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
        if (workers.length === 0) return "—";
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
      c.custom("status", tJobs("table.jobStatus"), (row) => {
        const expanded = getJobStatusRow(row);
        if (expanded) return <WorkflowColourStatusChip row={expanded} />;
        const id = getJobStatusId(row);
        if (row.job_pin_status?.trim()) {
          return <span className="text-sm capitalize text-slate-600 dark:text-slate-400">{row.job_pin_status}</span>;
        }
        return id != null ? `#${id}` : "—";
      }),
    ];
  }, [tJobs]);

  const listBack = React.useMemo(
    () => mergeUrlQueryParam(pathname, "tab", "jobs"),
    [pathname],
  );

  function openJob(id: number) {
    const detailPath = mergeUrlQueryParam(`${routes.dashboard.jobs}/${id}`, "job_category", jobCategory);
    router.push(buildDetailHrefWithListReturn(detailPath, listBack, id));
  }

  return (
    <div className={detailTabStandaloneFillClassName}>
      <div className={detailTabSectionClassName}>
        <h2 className={detailTabTitleClassName}>{t("jobsTitle")}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("jobsSubtitle")}</p>
      </div>
      <DetailTabListShell
        loading={loading}
        loadError={loadError}
        isEmpty={jobs.length === 0}
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
            message={loadError ?? t("jobsLoadError")}
            retryLabel={t("retry")}
            onRetry={onRetry}
          />
        }
      >
        <DetailTabTableBody>
          <EntityDataTable
            columns={columns}
            rows={jobs}
            onRowClick={(row) => openJob(row.id)}
            fillHeight={false}
          />
        </DetailTabTableBody>
      </DetailTabListShell>
    </div>
  );
}
