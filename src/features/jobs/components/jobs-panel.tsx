"use client";

import * as React from "react";
import { Calendar, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import { deleteJob, fetchJobsPage, updateJob } from "@/features/jobs/api/job.api";
import type { Job } from "@/features/jobs/types/job.types";
import {
  getJobStatusId,
  getJobStatusRow,
  jobAssignedWorkerLabel,
} from "@/features/jobs/utils/job-nested-fields.util";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListActiveInactiveEmptyState } from "@/shared/hooks/use-list-active-inactive-empty";
import { hasListActiveFilters, parseIsActiveParam, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  ActiveStatusBadge,
  AddButton,
  AppButton,
  CheckmarkSelect,
  ConfirmDialog,
  DashboardEmptyState,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageActiveFilter,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";

export function JobsPanel() {
  const t = useTranslations("Dashboard.jobs");
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

  const openJobDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
    },
    [listHref, pathname, router],
  );

  const {
    page,
    pageSize,
    listViewMode,
    search,
    isActiveParam,
    setUrl,
    setPage,
    setPageSize,
    setListViewMode,
  } = useListUrlState();
  const isActiveFilter = parseIsActiveParam(isActiveParam) ?? true;

  const jobStatusParam = searchParams.get("job_status");
  const assignedWorkerParam = searchParams.get("assigned_worker");

  const jobStatusFilter =
    jobStatusParam && /^\d+$/.test(jobStatusParam) ? Number.parseInt(jobStatusParam, 10) : undefined;
  const assignedWorkerFilter =
    assignedWorkerParam && /^\d+$/.test(assignedWorkerParam)
      ? Number.parseInt(assignedWorkerParam, 10)
      : undefined;

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

  const [workerOptions, setWorkerOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [jobStatusOptions, setJobStatusOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [statusById, setStatusById] = React.useState<Record<number, { status_name: string; bg_colour: string; text_colour: string }>>({});

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingJob, setDeletingJob] = React.useState<Job | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<number | null>(null);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const workerLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of workerOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [workerOptions]);

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
      try {
        const [workers, statuses] = await Promise.all([
          loadTechnicianOptions(),
          fetchJobStatusesPage(1, 500),
        ]);
        if (!cancelled) {
          setWorkerOptions(workers);
          setJobStatusOptions(statuses.items.map((s) => ({ value: String(s.id), label: s.status_name })));
          const byId: Record<number, { status_name: string; bg_colour: string; text_colour: string }> = {};
          for (const s of statuses.items) {
            byId[s.id] = {
              status_name: s.status_name,
              bg_colour: s.bg_colour,
              text_colour: s.text_colour,
            };
          }
          setStatusById(byId);
        }
      } catch {
        if (!cancelled) {
          setWorkerOptions([]);
          setJobStatusOptions([]);
          setStatusById({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchJobsPage(page, pageSize, {
          search: search || undefined,
          is_active: isActiveFilter,
          job_status: jobStatusFilter,
          assigned_worker: assignedWorkerFilter,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("loadError"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    pageSize,
    search,
    isActiveFilter,
    jobStatusFilter,
    assignedWorkerFilter,
    refreshNonce,
    t,
  ]);

  function openCreate() {
    router.push(`${pathname}/new?back=${encodeURIComponent(listHref)}`);
  }

  function openEdit(row: Job) {
    router.push(`${pathname}/${row.id}/edit?back=${encodeURIComponent(listHref)}`);
  }

  async function confirmDelete() {
    if (!deletingJob) return;
    setDeleting(true);
    try {
      await deleteJob(deletingJob.id);
      toastSuccess(t("deletedToast"));
      setDeleteOpen(false);
      setDeletingJob(null);
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(row: Job, next: boolean) {
    setTogglingId(row.id);
    try {
      await updateJob(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("toggleActiveError"));
    } finally {
      setTogglingId(null);
    }
  }

  function statusChipForRow(row: Job) {
    const expanded = getJobStatusRow(row);
    if (expanded) return <WorkflowColourStatusChip row={expanded} />;
    const id = getJobStatusId(row);
    const cached = id != null ? statusById[id] : null;
    if (cached) return <WorkflowColourStatusChip row={cached} />;
    if (row.job_pin_status?.trim()) {
      return <span className="text-sm capitalize text-slate-600 dark:text-slate-400">{row.job_pin_status}</span>;
    }
    return <span className="text-sm text-slate-500">—</span>;
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<Job>();
    return [
      c.primary("title", t("table.title"), (r) => r.title),
      c.custom("jobStatus", t("table.jobStatus"), (r) => statusChipForRow(r)),
      c.truncate("worker", t("table.assignedWorker"), (r) =>
        jobAssignedWorkerLabel(r, workerLabelById),
      ),
      c.tabular("start", t("table.start"), (r) => formatFlexibleApiDate(r.start_date, dateFmt)),
      c.tabular("end", t("table.end"), (r) => formatFlexibleApiDate(r.end_date, dateFmt)),
      c.status("status", t("table.recordStatus"), (r) => r.is_active, t("status.active"), t("status.inactive")),
      c.actions("actions", t("table.actions"), (row) => (
        <DataTableRowActionsMenu
          menuAriaLabel={tList("openRowActions")}
          items={[
            { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row) },
            {
              id: "delete",
              label: t("delete"),
              icon: Trash2,
              tone: "danger",
              onSelect: () => {
                setDeletingJob(row);
                setDeleteOpen(true);
              },
            },
            row.is_active
              ? {
                  id: "deactivate",
                  label: t("deactivate"),
                  icon: PowerOff,
                  onSelect: () => void handleToggleActive(row, false),
                  disabled: togglingId === row.id,
                }
              : {
                  id: "activate",
                  label: t("activate"),
                  icon: Power,
                  onSelect: () => void handleToggleActive(row, true),
                  disabled: togglingId === row.id,
                },
          ]}
        />
      )),
    ];
  }, [t, tList, dateFmt, workerLabelById, statusById, togglingId]);

  const hasActiveFilters = hasListActiveFilters({
    search,
    isActiveParam,
    jobStatusParam,
    assignedWorkerParam,
  });
  const countInactive = React.useCallback(async () => {
    const { pagination: p } = await fetchJobsPage(1, 1, {
      search: search || undefined,
      is_active: false,
      job_status: jobStatusFilter,
      assigned_worker: assignedWorkerFilter,
    });
    return p.total_records;
  }, [search, jobStatusFilter, assignedWorkerFilter]);
  const { hideListChrome, listLoading, emptyStateKind, filtersActive, switchToInactive } =
    useListActiveInactiveEmptyState({
      loading,
      loadError,
      itemsLength: items.length,
      isActiveParam,
      isActiveFilter,
      hasActiveFilters,
      setUrl,
      countInactive,
    });
  const pageRange = getListPageRange(pagination);

  function clearFilters() {
    setUrl(
      { search: null, is_active: null, job_status: null, assigned_worker: null, page: null },
      { replace: true },
    );
  }

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={<AddButton type="button" onClick={openCreate} />}
          controls={
            <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ListPageSearchField
                value={search}
                onCommit={commitSearch}
                placeholder={tList("searchPlaceholder")}
                ariaLabel={tList("searchAria")}
                className="sm:max-w-sm"
              />
              <CheckmarkSelect
                listLabel={t("filterJobStatus")}
                buttonAriaLabel={t("filterJobStatus")}
                options={jobStatusOptions}
                value={jobStatusParam ?? ""}
                emptyLabel={t("filterAllStatuses")}
                portaled
                searchable
                clearable
                className="w-full min-w-0 sm:w-44"
                onChange={(v) => setUrl({ job_status: v || null, page: null }, { replace: true })}
              />
              <CheckmarkSelect
                listLabel={t("filterAssignedWorker")}
                buttonAriaLabel={t("filterAssignedWorker")}
                options={workerOptions}
                value={assignedWorkerParam ?? ""}
                emptyLabel={t("filterAllWorkers")}
                portaled
                searchable
                clearable
                className="w-full min-w-0 sm:w-44"
                onChange={(v) => setUrl({ assigned_worker: v || null, page: null }, { replace: true })}
              />
              <ListPageActiveFilter
                activeLabel={t("status.active")}
                inactiveLabel={t("status.inactive")}
                filterLabel={t("filterState")}
                filterAriaLabel={t("filterState")}
                isActiveParam={isActiveParam}
                onChange={(isActive) =>
                  setUrl({ is_active: isActive ? null : "false", page: null }, { replace: true })
                }
              />
            </div>
          }
        />
      ) : null}

      <SurfaceShell className={hideListChrome ? "rounded-none border-dashed" : "rounded-none"}>
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
            </div>
          )
        ) : items.length === 0 ? (
          emptyStateKind === "onboarding" ? (
            <DashboardEmptyState
              iconName="jobStatus"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={<AddButton type="button" onClick={openCreate} />}
            />
          ) : emptyStateKind === "activeOnly" ? (
            <DashboardEmptyState
              iconName="noResults"
              title={tList("noActiveResultsTitle")}
              description={tList("noActiveResultsDescription")}
              action={
                <AppButton type="button" variant="secondary" size="sm" onClick={switchToInactive}>
                  {tList("viewInactive")}
                </AppButton>
              }
            />
          ) : (
            <DashboardEmptyState
              iconName="noResults"
              title={tList("noResultsTitle")}
              description={tList("noResultsDescription")}
              action={
                <AppButton type="button" variant="secondary" size="sm" onClick={clearFilters}>
                  {tList("clearFilters")}
                </AppButton>
              }
            />
          )
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  className={highlightClassName(row.id)}
                  title={row.title}
                  subtitle={jobAssignedWorkerLabel(row, workerLabelById)}
                  footer={
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {statusChipForRow(row)}
                        <ActiveStatusBadge
                          active={row.is_active}
                          label={row.is_active ? t("status.active") : t("status.inactive")}
                        />
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="size-3.5 shrink-0" aria-hidden />
                        {formatFlexibleApiDate(row.start_date, dateFmt)}
                      </span>
                    </div>
                  }
                  onCardClick={() => openJobDetail(row.id)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row) },
                        {
                          id: "delete",
                          label: t("delete"),
                          icon: Trash2,
                          tone: "danger",
                          onSelect: () => {
                            setDeletingJob(row);
                            setDeleteOpen(true);
                          },
                        },
                        row.is_active
                          ? {
                              id: "deactivate",
                              label: t("deactivate"),
                              icon: PowerOff,
                              onSelect: () => void handleToggleActive(row, false),
                              disabled: togglingId === row.id,
                            }
                          : {
                              id: "activate",
                              label: t("activate"),
                              icon: Power,
                              onSelect: () => void handleToggleActive(row, true),
                              disabled: togglingId === row.id,
                            },
                      ]}
                    />
                  }
                />
              ))}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable
            columns={tableColumns}
            rows={items}
            onRowClick={(row) => openJobDetail(row.id)}
            getRowClassName={(row) => highlightClassName(row.id)}
          />
        )}

        {!listLoading && !loadError && items.length > 0 ? (
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
              disabled: loading,
            }}
          />
        ) : null}
      </SurfaceShell>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deletingJob?.title}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
