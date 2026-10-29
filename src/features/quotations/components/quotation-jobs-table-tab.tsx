"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchJobsPage } from "@/features/jobs/api/job.api";
import { JOB_CATEGORY } from "@/features/jobs/constants/job-category";
import type { Job } from "@/features/jobs/types/job.types";
import {
  getJobAssignedWorkerRows,
  getJobStatusId,
  getJobStatusRow,
} from "@/features/jobs/utils/job-nested-fields.util";
import {
  EntityDataTable,
  EntityDetailErrorState,
  EntityDetailTabLoadingState,
  EntityLabelOverflowGroup,
  entityCol,
  entityNameLinkClassName,
} from "@/shared/components/entity";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { DetailTabListShell, DetailTabTableBody } from "@/shared/components/layout/detail-tab-list-shell";
import { routes } from "@/shared/config/routes";
import { DataTablePaginationBar, ListPageEmptyStates } from "@/shared/ui";
import {
  buildDetailHrefWithListReturn,
  buildEntityDetailTabBackHref,
  mergeUrlQueryParam,
} from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

type Props = {
  quotationId: number;
  jobCategory: string;
};

/** Project-quote jobs list — paginated table via `GET /jobs/?quotations=<id>`. */
export function QuotationJobsTableTab({ quotationId, jobCategory }: Props) {
  const t = useTranslations("Dashboard.quotations.relatedTabs");
  const tJobs = useTranslations("Dashboard.jobs");
  const tList = useTranslations("Dashboard.list");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [items, setItems] = React.useState<Job[]>([]);
  const [pagination, setPagination] = React.useState({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    next: null as string | null,
    previous: null as string | null,
  });
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const returnTo = React.useMemo(
    () => buildEntityDetailTabBackHref(pathname, "jobs", searchParams),
    [pathname, searchParams],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchJobsPage(page, pageSize, {
          quotations: quotationId,
          job_category: jobCategory || JOB_CATEGORY.project,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("jobsLoadError"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quotationId, jobCategory, page, pageSize, refreshNonce, t]);

  const openJobDetail = React.useCallback(
    (id: number) => {
      const detailPath = mergeUrlQueryParam(
        `${routes.dashboard.jobs}/${id}`,
        "job_category",
        jobCategory || JOB_CATEGORY.project,
      );
      router.push(buildDetailHrefWithListReturn(detailPath, returnTo, id));
    },
    [jobCategory, returnTo, router],
  );

  const columns = React.useMemo(() => {
    const c = entityCol<Job>();
    return [
      c.custom("title", tJobs("table.title"), (row) => {
        const serial = row.job_serial_number?.trim() || null;
        const title = row.title?.trim() || serial || `Job #${row.id}`;
        return (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className={`truncate font-semibold ${entityNameLinkClassName}`}>{title}</span>
            {serial && title !== serial ? (
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

  const pageRange = getListPageRange(pagination);

  return (
    <DetailTabListShell
      loading={loading}
      loadError={loadError}
      isEmpty={!loading && !loadError && items.length === 0}
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
          onRetry={() => setRefreshNonce((n) => n + 1)}
        />
      }
    >
      <DetailTabTableBody>
        <EntityDataTable
          columns={columns}
          rows={items}
          rowHighlightId={(row) => row.id}
          onRowClick={(row) => openJobDetail(row.id)}
          fillHeight={false}
        />
        <DataTablePaginationBar
          pagination={pagination}
          summary={tJobs("pageLabel", {
            start: pageRange.start,
            end: pageRange.end,
            total: pagination.total_records,
          })}
          prevLabel={tJobs("prev")}
          nextLabel={tJobs("next")}
          onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
          onNext={() => setPage(pagination.current_page + 1)}
          onPageSelect={(p) => setPage(p)}
          pageSizeControl={{
            label: tList("rowsPerPage"),
            listLabel: tList("rowsPerPage"),
            value: pageSize,
            options: pageSizeOptions,
            onChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
            disabled: loading,
          }}
        />
      </DetailTabTableBody>
    </DetailTabListShell>
  );
}
