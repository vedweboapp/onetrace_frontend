"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchAllWorkerFormSubmissions } from "@/features/job-forms/api/job-form.api";
import type { WorkerFormSubmissionTableRow } from "@/features/job-forms/types/job-form-submission.types";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import {
  getApiErrorDisplayMessage,
  toastApiError,
  toastError,
} from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  DataTablePaginationBar,
  ListPageCard,
  ListPageCardFooter,
  ListPageCardGrid,
  ListPageCardMetaLine,
  ListPageCardSkeleton,
  ListPageEmptyStates,
  listPageRootClassName,
  listPageSurfaceShellClassName,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

function resolveFormIds(row: WorkerFormSubmissionTableRow) {
  const listFormId = row.project_form_id != null && row.project_form_id > 0 ? row.project_form_id : null;
  const listJobFormId = row.job_form_id != null && row.job_form_id > 0 ? row.job_form_id : null;
  if (listFormId != null || listJobFormId != null) {
    return {
      formId: listFormId ?? listJobFormId ?? 0,
      jobFormId: listJobFormId ?? listFormId ?? 0,
    };
  }
  return null;
}

function jobLabel(row: WorkerFormSubmissionTableRow): string {
  const serial = row.job_serial_number?.trim();
  if (serial) return serial;
  const name = row.job_name?.trim();
  if (name) return name;
  if (row.job_id != null && row.job_id > 0) return `#${row.job_id}`;
  return "—";
}

export function WorkerFormsPanel() {
  const t = useTranslations("Dashboard.workerForms");
  const tJobs = useTranslations("Dashboard.jobs");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { highlightClassName } = useListRowHighlight();

  const listHref = React.useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("highlight");
    const qs = p.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }, [pathname, searchParams]);

  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } =
    useListUrlState();

  const [items, setItems] = React.useState<WorkerFormSubmissionTableRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [openingSubmissionId, setOpeningSubmissionId] = React.useState<number | null>(null);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const list = await fetchAllWorkerFormSubmissions();
        if (!cancelled) setItems(list);
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setLoadError(getApiErrorDisplayMessage(error) || t("loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const haystack = [
        String(row.id),
        row.worker_name,
        row.project_form_name,
        jobLabel(row),
        row.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageRows = React.useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  React.useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage, setPage]);

  const pagination = React.useMemo(
    () => ({
      total_records: totalRecords,
      total_pages: totalPages,
      current_page: safePage,
      page_size: pageSize,
      next: safePage < totalPages ? "next" : null,
      previous: safePage > 1 ? "prev" : null,
    }),
    [pageSize, safePage, totalPages, totalRecords],
  );
  const pageRange = getListPageRange(pagination);

  const hasActiveFilters = hasListActiveFilters({ search });
  const { hideListChrome, listLoading, emptyStateKind } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });

  function openSubmission(row: WorkerFormSubmissionTableRow) {
    if (openingSubmissionId != null) return;
    const jobId = row.job_id != null && row.job_id > 0 ? row.job_id : null;
    if (jobId == null) {
      toastError(t("missingJob"));
      return;
    }

    setOpeningSubmissionId(row.id);
    try {
      const resolved = resolveFormIds(row);
      const formName = row.project_form_name.trim() || tJobs("forms.untitledForm");
      const common = `submission_id=${row.id}&name=${encodeURIComponent(formName)}&back=${encodeURIComponent(listHref)}`;

      if (resolved && resolved.formId > 0) {
        const jobFormId = resolved.jobFormId > 0 ? resolved.jobFormId : resolved.formId;
        router.push(
          `${routes.dashboard.jobFormFill(jobId, resolved.formId, jobFormId)}&${common}`,
        );
        return;
      }

      router.push(`${routes.dashboard.jobs}/${jobId}/form?${common}`);
    } catch (error) {
      toastApiError(error, tJobs("forms.loadError"));
    } finally {
      setOpeningSubmissionId(null);
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<WorkerFormSubmissionTableRow>();
    return [
      c.primary("id", t("columns.id"), (row) => row.id, { narrow: true }),
      c.text("job", t("columns.job"), (row) => jobLabel(row)),
      c.text("worker", t("columns.workerName"), (row) => row.worker_name || "—"),
      c.text("form", t("columns.projectFormName"), (row) => row.project_form_name || "—"),
      c.custom("submittedAt", t("columns.submittedAt"), (row) =>
        formatFlexibleApiDate(row.submitted_at, dateFmt) || "—",
      ),
    ];
  }, [dateFmt, t]);

  return (
    <div className={listPageRootClassName()} data-list-page>
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={hasActiveFilters}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          controls={
            <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ListPageSearchField
                value={search}
                onCommit={commitSearch}
                placeholder={t("searchPlaceholder")}
                ariaLabel={t("searchPlaceholder")}
                className="sm:max-w-sm"
              />
            </div>
          }
        />
      ) : null}

      <SurfaceShell className={listPageSurfaceShellClassName(hideListChrome)}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : listLoading ? (
          listViewMode === "list" ? (
            <div className="p-4 sm:p-6">
              <ListPageCardGrid>
                {Array.from({ length: 6 }, (_, i) => (
                  <ListPageCardSkeleton key={i} />
                ))}
              </ListPageCardGrid>
            </div>
          ) : (
            <div className="space-y-2 p-6">
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          )
        ) : filtered.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={items.length === 0 ? emptyStateKind : "filtered"}
            onboarding={{
              iconName: "default",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
            }}
            onClearFilters={() => setUrl({ search: null, page: null }, { replace: true })}
          />
        ) : listViewMode === "list" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <ListPageCardGrid>
              {pageRows.map((row) => {
                const busy = openingSubmissionId === row.id;
                return (
                  <ListPageCard
                    key={row.id}
                    dataListRowId={row.id}
                    className={busy ? `opacity-60 ${highlightClassName(row.id)}` : highlightClassName(row.id)}
                    title={row.project_form_name || tJobs("forms.untitledForm")}
                    subtitle={row.worker_name || "—"}
                    meta={
                      <ListPageCardMetaLine>
                        {t("columns.job")}: {jobLabel(row)}
                      </ListPageCardMetaLine>
                    }
                    footer={
                      <ListPageCardFooter
                        start={<span className="tabular-nums text-xs text-slate-400">#{row.id}</span>}
                        end={formatFlexibleApiDate(row.submitted_at, dateFmt) || "—"}
                      />
                    }
                    onCardClick={() => {
                      if (!busy) openSubmission(row);
                    }}
                  />
                );
              })}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable
            columns={tableColumns}
            rows={pageRows}
            onRowClick={(row) => openSubmission(row)}
            getRowClassName={(row) =>
              openingSubmissionId === row.id
                ? `opacity-60 ${highlightClassName(row.id)}`
                : highlightClassName(row.id)
            }
          />
        )}

        {!loading && !loadError && filtered.length > 0 ? (
          <DataTablePaginationBar
            pagination={pagination}
            summary={t("pageLabel", {
              start: pageRange.start,
              end: pageRange.end,
              total: pagination.total_records,
            })}
            prevLabel={t("prev")}
            nextLabel={t("next")}
            onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
            onNext={() => setPage(pagination.current_page + 1)}
            onPageSelect={(p) => setPage(p)}
            pageSizeControl={{
              label: tList("rowsPerPage"),
              listLabel: tList("rowsPerPage"),
              value: pageSize,
              options: pageSizeOptions,
              onChange: setPageSize,
            }}
          />
        ) : null}
      </SurfaceShell>
    </div>
  );
}
