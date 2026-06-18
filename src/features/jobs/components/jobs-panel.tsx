"use client";

import * as React from "react";
import { Calendar, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchFormsPage } from "@/features/forms/api/forms.api";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import { deleteJob, fetchAllJobIds, fetchJobsPage } from "@/features/jobs/api/job.api";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import { fetchSitesPage } from "@/features/sites/api/site.api";
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
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  MassActionBar,
  buildJobMassUpdateFields,
  useEntityListMassActions,
} from "@/shared/mass-actions";
import {
  AddButton,
  CheckmarkSelect,
  ConfirmDialog,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
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
    setUrl,
    setPage,
    setPageSize,
    setListViewMode,
  } = useListUrlState();

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
  const [massClientOptions, setMassClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massProjectOptions, setMassProjectOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massSiteOptions, setMassSiteOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massFormOptions, setMassFormOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [statusById, setStatusById] = React.useState<Record<number, { status_name: string; bg_colour: string; text_colour: string }>>({});

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingJob, setDeletingJob] = React.useState<Job | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const listFilters = React.useMemo(
    () => ({
      search: search || undefined,
      job_status: jobStatusFilter,
      assigned_worker: assignedWorkerFilter,
    }),
    [search, jobStatusFilter, assignedWorkerFilter],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildJobMassUpdateFields(
        {
          workerOptions,
          jobStatusOptions,
          clientOptions: massClientOptions,
          projectOptions: massProjectOptions,
          siteOptions: massSiteOptions,
          formOptions: massFormOptions,
        },
        {
          title: t("fields.title"),
          description: t("fields.description"),
          client: t("fields.client"),
          project: t("fields.project"),
          site: t("fields.site"),
          forms: t("fields.forms"),
          jobStatus: t("fields.jobStatus"),
          assignedWorker: t("fields.assignedWorker"),
          startDate: t("fields.startDate"),
        },
      ),
    [workerOptions, jobStatusOptions, massClientOptions, massProjectOptions, massSiteOptions, massFormOptions, t],
  );

  const fetchAllIds = React.useCallback(
    () => fetchAllJobIds(listFilters, { silent: true }),
    [listFilters],
  );

  const mass = useEntityListMassActions({
    resource: "jobs",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search, jobStatusFilter, assignedWorkerFilter],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

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
        const [workers, statuses, clients, projects, sites, forms] = await Promise.all([
          loadTechnicianOptions(),
          fetchJobStatusesPage(1, 500),
          fetchClientsPage(1, 500, { is_active: true }, { silent: true }),
          fetchProjectsPage(1, 500, { is_active: true }),
          fetchSitesPage(1, 500, { is_active: true }),
          fetchFormsPage(1, 500, undefined, { silent: true }),
        ]);
        if (!cancelled) {
          setWorkerOptions(workers);
          setJobStatusOptions(statuses.items.map((s) => ({ value: String(s.id), label: s.status_name })));
          setMassClientOptions(clients.items.map((c) => ({ value: String(c.id), label: c.name })));
          setMassProjectOptions(projects.items.map((p) => ({ value: String(p.id), label: p.name })));
          setMassSiteOptions(sites.items.map((s) => ({ value: String(s.id), label: s.site_name })));
          setMassFormOptions(
            forms.items.map((f) => ({
              value: String(f.id),
              label: f.name?.trim() || `#${f.id}`,
            })),
          );
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
          setMassClientOptions([]);
          setMassProjectOptions([]);
          setMassSiteOptions([]);
          setMassFormOptions([]);
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
      c.selection(
        "select",
        (
          <input
            ref={mass.selection.selectAllRef}
            type="checkbox"
            className={mass.selection.rowCheckboxClassName}
            checked={mass.selection.allMatchingSelected}
            disabled={mass.selection.selectingAll || items.length === 0}
            aria-label={mass.selectAllAriaLabel}
            onChange={() => void mass.selection.toggleSelectAll()}
          />
        ),
        (row) => (
          <input
            type="checkbox"
            className={mass.selection.rowCheckboxClassName}
            checked={mass.selection.isSelected(row.id)}
            aria-label={mass.selectRowAriaLabel}
            onChange={() => mass.selection.toggleRowSelected(row.id)}
          />
        ),
        { narrow: true },
      ),
      c.custom("Serial No.", t("table.serialNo"), (r) => r.job_serial_number),
      c.primary("title", t("table.title"), (r) => r.title),
      c.custom("jobStatus", t("table.jobStatus"), (r) => statusChipForRow(r)),
      c.truncate("worker", t("table.assignedWorker"), (r) =>
        jobAssignedWorkerLabel(r, workerLabelById),
      ),
      c.tabular("start", t("table.start"), (r) => formatFlexibleApiDate(r.start_date, dateFmt)),
      c.tabular("end", t("table.end"), (r) => formatFlexibleApiDate(r.end_date, dateFmt)),
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
          ]}
        />
      )),
    ];
  }, [
    t,
    tList,
    dateFmt,
    workerLabelById,
    statusById,
    mass,
  ]);

  const hasActiveFilters = hasListActiveFilters({
    search,
    jobStatusParam,
    assignedWorkerParam,
  });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

  function clearFilters() {
    setUrl({ search: null, job_status: null, assigned_worker: null, page: null }, { replace: true });
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
            </div>
          }
        />
      ) : null}

      {mass.selectedCount > 0 && !listLoading && !loadError ? (
        <MassActionBar
          selectedIds={mass.selectedIds}
          config={mass.config}
          updateFields={mass.updateFields}
          onSuccess={mass.handleMassSuccess}
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
            </div>
          )
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "jobStatus",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: <AddButton type="button" onClick={openCreate} />,
            }}
            onClearFilters={clearFilters}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  className={highlightClassName(row.id)}
                  leading={
                    <input
                      type="checkbox"
                      className={mass.selection.rowCheckboxClassName}
                      checked={mass.selection.isSelected(row.id)}
                      aria-label={mass.selectRowAriaLabel}
                      onChange={() => mass.selection.toggleRowSelected(row.id)}
                    />
                  }
                  title={row.title}
                  subtitle={jobAssignedWorkerLabel(row, workerLabelById)}
                  footer={
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">{statusChipForRow(row)}</div>
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
