"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import { deleteJob, fetchAllJobIds, fetchJobsPage } from "@/features/jobs/api/job.api";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { Job } from "@/features/jobs/types/job.types";
import {
  getJobAssignedWorkerId,
  getJobClientId,
  getJobProjectId,
  getJobStatusId,
  getJobStatusRow,
  jobAssignedWorkerLabel,
  jobClientLabel,
  jobProjectLabel,
} from "@/features/jobs/utils/job-nested-fields.util";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { DetailEntityLink, EntityDataTable, entityCol, entityNameLinkClassName } from "@/shared/components/entity";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { routes } from "@/shared/config/routes";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
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
  listPageRootClassName,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn, buildPathWithStoredBack, storeBackHrefForPath } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { toastError, toastSuccess, toastApiError, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

export function JobsPanel() {
  const t = useTranslations("Dashboard.jobs");
  const tList = useTranslations("Dashboard.list");
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

  const {
    page,
    pageSize,
    listViewMode,
    search,
    setUrl,
    setPage,
    setPageSize,
    setListViewMode,
  } = useListUrlState({ defaultPageSize: 10 });

  const jobStatusParam = searchParams.get("job_status");
  const assignedWorkerParam = searchParams.get("assigned_worker");
  const jobCategoryParam = searchParams.get("job_category") ?? "";
  const jobTypeParam = searchParams.get("job_type") ?? "";
  const isProjectJob =
    jobCategoryParam.toLowerCase().replace(/[^a-z]/g, "") === "projectjob";

  const openJobDetail = React.useCallback(
    (id: number) => {
      const detailPath = buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id);
      const targetUrl = jobCategoryParam
        ? `${detailPath}?job_category=${encodeURIComponent(jobCategoryParam)}`
        : detailPath;
      router.push(targetUrl);
    },
    [jobCategoryParam, listHref, pathname, router],
  );

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
    page_size: 10,
    next: null as string | null,
    previous: null as string | null,
  });
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [fetchFilterOptions, setFetchFilterOptions] = React.useState(
    () => Boolean(jobStatusParam || assignedWorkerParam || jobTypeParam || jobCategoryParam),
  );
  const [fetchMassOptions, setFetchMassOptions] = React.useState(false);

  const [workerOptions, setWorkerOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [jobStatusOptions, setJobStatusOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massClientOptions, setMassClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massProjectOptions, setMassProjectOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massSiteOptions, setMassSiteOptions] = React.useState<{ value: string; label: string }[]>([]);
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
      job_type: jobTypeParam || undefined,
      job_category: jobCategoryParam || undefined,
    }),
    [search, jobStatusFilter, assignedWorkerFilter, jobTypeParam, jobCategoryParam],
  );

  const fetchAllIds = React.useCallback(
    () => fetchAllJobIds(listFilters, { silent: true }),
    [listFilters],
  );

  const jobDirectUpdateActions = React.useMemo(
    () => [
      {
        id: "assign-worker",
        label: t("massAssignWorker"),
        fieldName: "assigned_worker",
        options: workerOptions,
        valueCoerce: "number" as const,
      },
    ],
    [t, workerOptions],
  );

  const mass = useEntityListMassActions({
    resource: "jobs",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search, jobStatusFilter, assignedWorkerFilter, jobTypeParam, jobCategoryParam],
    updateFields: [],
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

  const massUpdateFields = React.useMemo(
    () =>
      buildJobMassUpdateFields(
        {
          jobStatusOptions,
          clientOptions: massClientOptions,
          projectOptions: massProjectOptions,
          siteOptions: massSiteOptions,
          formOptions: [],
        },
        {
          title: t("fields.title"),
          description: t("fields.description"),
          client: t("fields.client"),
          project: t("fields.project"),
          site: t("fields.site"),
          forms: t("fields.forms"),
          jobStatus: t("fields.jobStatus"),
          startDate: t("fields.startDate"),
        },
        { includeForms: false },
      ),
    [
      jobStatusOptions,
      massClientOptions,
      massProjectOptions,
      massSiteOptions,
      t,
    ],
  );

  const workerLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of workerOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [workerOptions]);

  const clientLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of massClientOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [massClientOptions]);

  const projectLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of massProjectOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [massProjectOptions]);

  const jobClientDisplay = React.useCallback(
    (row: Job) => {
      const id = getJobClientId(row.client);
      return jobClientLabel(row.client, id != null ? clientLabelById[id] : undefined);
    },
    [clientLabelById],
  );

  const jobProjectDisplay = React.useCallback(
    (row: Job) => {
      const id = getJobProjectId(row.project);
      return jobProjectLabel(row.project, id != null ? projectLabelById[id] : undefined);
    },
    [projectLabelById],
  );

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  React.useEffect(() => {
    if (!fetchFilterOptions) return;
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
  }, [fetchFilterOptions]);

  React.useEffect(() => {
    if (!fetchMassOptions) return;
    let cancelled = false;
    (async () => {
      try {
        const [clients, projects, sites] = await Promise.all([
          fetchClientsPage(1, 500, { is_active: true }, { silent: true }),
          fetchProjectsPage(1, 500, { is_active: true }),
          fetchSitesPage(1, 500, { is_active: true }),
        ]);
        if (!cancelled) {
          setMassClientOptions(clients.items.map((c) => ({ value: String(c.id), label: c.name })));
          setMassProjectOptions(projects.items.map((p) => ({ value: String(p.id), label: p.name })));
          setMassSiteOptions(sites.items.map((s) => ({ value: String(s.id), label: s.site_name })));
        }
      } catch {
        if (!cancelled) {
          setMassClientOptions([]);
          setMassProjectOptions([]);
          setMassSiteOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMassOptions]);

  React.useEffect(() => {
    if (jobStatusParam || assignedWorkerParam) setFetchFilterOptions(true);
  }, [jobStatusParam, assignedWorkerParam]);

  React.useEffect(() => {
    if (mass.selectedCount > 0) {
      setFetchMassOptions(true);
      setFetchFilterOptions(true);
    }
  }, [mass.selectedCount]);

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
          job_type: jobTypeParam || undefined,
          job_category: jobCategoryParam || undefined,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
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
    jobCategoryParam,
    jobStatusFilter,
    assignedWorkerFilter,
    jobTypeParam,
    refreshNonce,
    t,
  ]);

  function openCreate() {
    const newPath = `${pathname}/new`;
    // Store the back href manually because buildPathWithStoredBack strips query strings
    storeBackHrefForPath(newPath, listHref);
    // Navigate with the job_category param so the create form and sidebar stay in sync
    const targetUrl = jobCategoryParam
      ? `${newPath}?job_category=${encodeURIComponent(jobCategoryParam)}`
      : newPath;
    router.push(targetUrl);
  }

  function openEdit(row: Job) {
    const editPath = buildPathWithStoredBack(`${pathname}/${row.id}/edit`, listHref);
    const targetUrl = jobCategoryParam
      ? `${editPath}?job_category=${encodeURIComponent(jobCategoryParam)}`
      : editPath;
    router.push(targetUrl);
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
    } catch (error) {
      toastApiError(error, t("deleteError"));
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
      c.primary("title", t("table.title"), (r) => r.title),
      c.link(
        "worker",
        t("table.assignedWorker"),
        (r) => jobAssignedWorkerLabel(r, workerLabelById),
        (r) => {
          const id = getJobAssignedWorkerId(r);
          return id != null ? `${routes.dashboard.settingsUsers}/${id}` : null;
        },
        { title: (r) => jobAssignedWorkerLabel(r, workerLabelById) },
      ),
      c.link(
        "client",
        t("fields.client"),
        (r) => jobClientDisplay(r),
        (r) => {
          const id = getJobClientId(r.client);
          return id != null ? `${routes.dashboard.clients}/${id}` : null;
        },
        { title: (r) => jobClientDisplay(r) },
      ),
      ...(isProjectJob
        ? [
            c.link(
              "project",
              t("fields.project"),
              (r) => jobProjectDisplay(r),
              (r) => {
                const id = getJobProjectId(r.project);
                return id != null ? `${routes.dashboard.projects}/${id}` : null;
              },
              { title: (r) => jobProjectDisplay(r) },
            ),
          ]
        : []),
      c.custom("jobStatus", t("table.jobStatus"), (r) => statusChipForRow(r)),
    ];
  }, [
    t,
    workerLabelById,
    jobClientDisplay,
    jobProjectDisplay,
    isProjectJob,
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
    setUrl({ search: null, job_status: null, assigned_worker: null, job_type: null, page: null }, { replace: true });
  }

  return (
    <div className={listPageRootClassName()}>
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
                onOpenChange={(open) => {
                  if (open) setFetchFilterOptions(true);
                }}
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
                onOpenChange={(open) => {
                  if (open) setFetchFilterOptions(true);
                }}
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
          updateFields={massUpdateFields}
          directUpdateActions={jobDirectUpdateActions}
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
              {items.map((row) => {
                const clientId = getJobClientId(row.client);
                const projectId = getJobProjectId(row.project);
                const workerId = getJobAssignedWorkerId(row);
                const clientLabel = jobClientDisplay(row);
                const projectLabel = jobProjectDisplay(row);
                const workerLabel = jobAssignedWorkerLabel(row, workerLabelById);
                return (
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
                  title={<span className={entityNameLinkClassName}>{row.title}</span>}
                  subtitle={
                    workerId != null ? (
                      <DetailEntityLink
                        href={`${routes.dashboard.settingsUsers}/${workerId}`}
                        className="min-w-0 truncate font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {workerLabel}
                      </DetailEntityLink>
                    ) : (
                      workerLabel
                    )
                  }
                  meta={
                    <span
                      className="flex min-w-0 items-center gap-1 truncate"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {clientId != null ? (
                        <DetailEntityLink
                          href={`${routes.dashboard.clients}/${clientId}`}
                          className="min-w-0 truncate font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {clientLabel}
                        </DetailEntityLink>
                      ) : (
                        <span className="min-w-0 truncate">{clientLabel}</span>
                      )}
                      <span className="shrink-0 text-slate-400" aria-hidden>
                        ·
                      </span>
                      {projectId != null ? (
                        <DetailEntityLink
                          href={`${routes.dashboard.projects}/${projectId}`}
                          className="min-w-0 truncate font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {projectLabel}
                        </DetailEntityLink>
                      ) : (
                        <span className="min-w-0 truncate">{projectLabel}</span>
                      )}
                    </span>
                  }
                  footer={
                    <div className="flex w-full flex-wrap items-center gap-2">{statusChipForRow(row)}</div>
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
                );
              })}
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
