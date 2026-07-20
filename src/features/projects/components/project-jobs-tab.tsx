"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchProjectFormsByProject } from "@/features/forms/api/forms.api";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import { deleteJob } from "@/features/jobs/api/job.api";
import { jobAssignedWorkerLabel, jobClientLabel } from "@/features/jobs/utils/job-nested-fields.util";
import { fetchProjectJobsHierarchy, fetchProjectsPage } from "@/features/projects/api/project.api";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { ProjectJobListItem } from "@/features/projects/types/project-jobs.types";
import {
  collectProjectJobLevelOptions,
  collectProjectJobPlotOptions,
  DEFAULT_PROJECT_JOBS_SOURCE,
  filterProjectJobsHierarchy,
  flattenFilteredHierarchyToListItems,
  type ProjectJobsSourceFilter,
} from "@/features/projects/utils/project-jobs-list.util";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { routes } from "@/shared/config/routes";
import { getApiErrorDisplayMessage, toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import type { ListEmptyStateKind } from "@/shared/hooks/use-list-active-inactive-empty";
import {
  buildJobMassUpdateFields,
  MassActionBar,
  massSelectionColumn,
  useEntityListMassActions,
} from "@/shared/mass-actions";
import { CheckmarkSelect, ConfirmDialog, DataTableRowActionsMenu, ListPageEmptyStates, ListPageSearchField, SurfaceShell, DataTablePaginationBar, DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableTd, DataTableTh, DataTableScroll } from "@/shared/ui";
import {
  buildDetailHrefWithListReturn,
  buildPathWithStoredBack,
  buildProjectJobsTabHref,
} from "@/shared/utils/detail-from-list.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  projectId: number;
};

export function ProjectJobsTab({ projectId }: Props) {
  const t = useTranslations("Dashboard.projects.jobsTab");
  const tJobs = useTranslations("Dashboard.jobs");
  const tList = useTranslations("Dashboard.list");
  const router = useRouter();
  const pathname = usePathname();
  const { highlightClassName } = useListRowHighlight();
  const dateFmt = useDashboardDateFormat();

  const listBack = React.useMemo(() => buildProjectJobsTabHref(pathname), [pathname]);

  const openJobDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${routes.dashboard.jobs}/${id}`, listBack, id));
    },
    [listBack, router],
  );

  const openEdit = React.useCallback(
    (job: ProjectJobListItem) => {
      router.push(buildPathWithStoredBack(`${routes.dashboard.jobs}/${job.id}/edit`, listBack));
    },
    [listBack, router],
  );

  const [search, setSearch] = React.useState("");
  const [jobStatusFilter, setJobStatusFilter] = React.useState<number | undefined>();
  // const [jobSourceFilter, setJobSourceFilter] = React.useState<ProjectJobsSourceFilter>(DEFAULT_PROJECT_JOBS_SOURCE);
  const [levelFilter, setLevelFilter] = React.useState<number | undefined>();
  const [plotFilter, setPlotFilter] = React.useState<number | undefined>();

  const [hierarchy, setHierarchy] = React.useState<Awaited<ReturnType<typeof fetchProjectJobsHierarchy>> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [jobStatusOptions, setJobStatusOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massClientOptions, setMassClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massProjectOptions, setMassProjectOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massSiteOptions, setMassSiteOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massFormOptions, setMassFormOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [workerOptions, setWorkerOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [statusById, setStatusById] = React.useState<
    Record<number, { status_name: string; bg_colour: string; text_colour: string }>
  >({});

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingJob, setDeletingJob] = React.useState<ProjectJobListItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [fetchMassOptions, setFetchMassOptions] = React.useState(false);

  const listFilters = React.useMemo(
    () => ({
      search: search || undefined,
      job_status: jobStatusFilter,
      // job_source: jobSourceFilter,
      level_id: levelFilter,
      plot_id: plotFilter,
    }),
    [search, jobStatusFilter, levelFilter, plotFilter],
  );

  const filteredHierarchy = React.useMemo(
    () => (hierarchy ? filterProjectJobsHierarchy(hierarchy, listFilters) : { levels: [], manual_jobs: [] }),
    [hierarchy, listFilters],
  );

  const tableRows = React.useMemo(
    () => flattenFilteredHierarchyToListItems(filteredHierarchy),
    [filteredHierarchy],
  );

  // Pagination state (client-side paging over filtered rows)
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const totalPages = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));
  const paginatedRows = React.useMemo(() => {
    const start = page * rowsPerPage;
    return tableRows.slice(start, start + rowsPerPage);
  }, [tableRows, page, rowsPerPage]);

  const levelOptions = React.useMemo(() => (hierarchy ? collectProjectJobLevelOptions(hierarchy) : []), [hierarchy]);
  const plotOptions = React.useMemo(
    () => (hierarchy ? collectProjectJobPlotOptions(hierarchy, levelFilter) : []),
    [hierarchy, levelFilter],
  );

  // const jobSourceOptions = React.useMemo(
  //   () => [
  //     { value: DEFAULT_PROJECT_JOBS_SOURCE, label: t("filterAllSources") },
  //     { value: "quotation", label: t("filterQuotationSource") },
  //     { value: "manual", label: t("filterManualSource") },
  //   ],
  //   [t],
  // );

  const workerLabelById = React.useMemo(() => {
    const map: Record<number, string> = {};
    for (const option of workerOptions) {
      const id = Number.parseInt(option.value, 10);
      if (Number.isFinite(id)) map[id] = option.label;
    }
    return map;
  }, [workerOptions]);

  const jobDirectUpdateActions = React.useMemo(
    () => [
      {
        id: "assign-worker",
        label: tJobs("massAssignWorker"),
        fieldName: "assigned_worker",
        options: workerOptions,
        valueCoerce: "number" as const,
      },
    ],
    [tJobs, workerOptions],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildJobMassUpdateFields(
        {
          jobStatusOptions,
          clientOptions: massClientOptions,
          projectOptions: massProjectOptions,
          siteOptions: massSiteOptions,
          formOptions: massFormOptions,
        },
        {
          title: tJobs("fields.title"),
          description: tJobs("fields.description"),
          client: tJobs("fields.client"),
          project: tJobs("fields.project"),
          site: tJobs("fields.site"),
          forms: tJobs("fields.forms"),
          jobStatus: tJobs("fields.jobStatus"),
          startDate: tJobs("fields.startDate"),
        },
        { includeForms: true },
      ),
    [jobStatusOptions, massClientOptions, massProjectOptions, massSiteOptions, massFormOptions, tJobs],
  );

  const mass = useEntityListMassActions({
    resource: "jobs",
    pageItems: tableRows,
    resetDeps: [search, jobStatusFilter,  levelFilter, plotFilter],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

  const massSel = React.useMemo(() => massSelectionColumn(mass, tableRows.length), [mass, tableRows.length]);

  const commitSearch = React.useCallback((q: string) => {
    setSearch(q.trim());
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [workers, statuses] = await Promise.all([
          loadTechnicianOptions(),
          fetchJobStatusesPage(1, 500),
        ]);
        if (cancelled) return;

        setWorkerOptions(workers);
        setJobStatusOptions(statuses.items.map((status) => ({ value: String(status.id), label: status.status_name })));

        const byId: Record<number, { status_name: string; bg_colour: string; text_colour: string }> = {};
        for (const status of statuses.items) {
          byId[status.id] = {
            status_name: status.status_name,
            bg_colour: status.bg_colour,
            text_colour: status.text_colour,
          };
        }
        setStatusById(byId);
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
    if (!fetchMassOptions) return;
    let cancelled = false;
    (async () => {
      try {
        const [clients, projects, sites, forms] = await Promise.all([
          fetchClientsPage(1, 500, { is_active: true }, { silent: true }),
          fetchProjectsPage(1, 500, { is_active: true }),
          fetchSitesPage(1, 500, { is_active: true }),
          fetchProjectFormsByProject(projectId, { silent: true }),
        ]);
        if (cancelled) return;

        setMassClientOptions(clients.items.map((client) => ({ value: String(client.id), label: client.name })));
        setMassProjectOptions(projects.items.map((project) => ({ value: String(project.id), label: project.name })));
        setMassSiteOptions(sites.items.map((site) => ({ value: String(site.id), label: site.site_name })));
        setMassFormOptions(
          forms.map((form) => ({
            value: String(form.id),
            label: form.name?.trim() || `#${form.id}`,
          })),
        );
      } catch {
        if (!cancelled) {
          setMassClientOptions([]);
          setMassProjectOptions([]);
          setMassSiteOptions([]);
          setMassFormOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMassOptions, projectId]);

  React.useEffect(() => {
    if (mass.selectedCount > 0) setFetchMassOptions(true);
  }, [mass.selectedCount]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchProjectJobsHierarchy(projectId, { silent: true });
        if (!cancelled) setHierarchy(data);
      } catch (error) {
        if (!cancelled) {
          setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
          setHierarchy(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshNonce, t]);

  const statusChipForJob = React.useCallback(
    (job: ProjectJobListItem) => {
      const status = job.status;
      if (!status) return <span className="text-sm text-slate-500">—</span>;
      const cached = statusById[status.id];
      if (cached) return <WorkflowColourStatusChip row={cached} />;
      if (status.name?.trim()) {
        return <span className="text-sm capitalize text-slate-600 dark:text-slate-400">{status.name}</span>;
      }
      return <span className="text-sm text-slate-500">—</span>;
    },
    [statusById],
  );

  const locationLabelForJob = React.useCallback(
    (job: ProjectJobListItem) => {
      if (job.level_name && job.plot_name) return `${job.level_name} / ${job.plot_name}`;
      if (job.level_name) return job.level_name;
      if (job.plot_name) return job.plot_name;
      return t("manualJobLocation");
    },
    [t],
  );

  const tableColumns = React.useMemo(() => {
    const c = entityCol<ProjectJobListItem>();
    return [
      massSel.tableColumn,
      // c.tabular("serial", tJobs("table.serialNo"), (row) =>
      //   row.job_serial_number?.trim() ? row.job_serial_number : `#${row.id}`,
      // ),
      c.primary("title", tJobs("table.title"), (row) => row.title?.trim() || "—"),
      c.truncate("location", t("table.location"), (row) => locationLabelForJob(row), {
        title: (row) => locationLabelForJob(row),
        responsive: "md",
      }),
      c.truncate("worker", tJobs("table.assignedWorker"), (row) => jobAssignedWorkerLabel(row, workerLabelById), {
        title: (row) => jobAssignedWorkerLabel(row, workerLabelById),
      }),
      
      c.custom("jobStatus", tJobs("table.jobStatus"), (row) => statusChipForJob(row)),
      c.tabular("start", tJobs("table.start"), (row) => formatFlexibleApiDate(row.start_date, dateFmt), {
        responsive: "lg",
      }),
      c.tabular("end", tJobs("table.end"), (row) => formatFlexibleApiDate(row.completed_at ?? "", dateFmt), {
        responsive: "lg",
      }),
      c.truncate(
        "client",
        tJobs("fields.client"),
        (row) => jobClientLabel(row.client),
        {
          title: (row) => jobClientLabel(row.client),
          responsive: "sm",
        },
      ),
      // c.actions("actions", tJobs("table.actions"), (row) => (
      //   <DataTableRowActionsMenu
      //     menuAriaLabel={tList("openRowActions")}
      //     items={[
      //       { id: "edit", label: tJobs("edit"), icon: Pencil, onSelect: () => openEdit(row) },
      //       {
      //         id: "delete",
      //         label: tJobs("delete"),
      //         icon: Trash2,
      //         tone: "danger",
      //         onSelect: () => {
      //           setDeletingJob(row);
      //           setDeleteOpen(true);
      //         },
      //       },
      //     ]}
      //   />
      // )),
    ];
  }, [dateFmt, locationLabelForJob, massSel.tableColumn, openEdit, statusChipForJob, t, tJobs, tList, workerLabelById]);

  const hasActiveFilters =
    search.trim() !== "" ||
    jobStatusFilter != null ||
    // jobSourceFilter !== DEFAULT_PROJECT_JOBS_SOURCE ||
    levelFilter != null ||
    plotFilter != null;

  // Reset page when filters change
  React.useEffect(() => {
    setPage(0);
  }, [search, jobStatusFilter, levelFilter, plotFilter]);

  // Ensure current page is within totalPages when rowsPerPage or total changes
  React.useEffect(() => {
    if (page > Math.max(0, totalPages - 1)) setPage(Math.max(0, totalPages - 1));
  }, [totalPages, page]);

  const emptyStateKind: ListEmptyStateKind = React.useMemo(() => {
    if (loading || loadError || tableRows.length > 0) return "none";
    if (hasActiveFilters) return "filtered";
    return "onboarding";
  }, [loading, loadError, tableRows.length, hasActiveFilters]);

  function clearFilters() {
    setSearch("");
    setJobStatusFilter(undefined);
    // setJobSourceFilter(DEFAULT_PROJECT_JOBS_SOURCE);
    setLevelFilter(undefined);
    setPlotFilter(undefined);
  }

  async function confirmDelete() {
    if (!deletingJob) return;
    setDeleting(true);
    try {
      await deleteJob(deletingJob.id);
      toastSuccess(tJobs("deletedToast"));
      setDeleteOpen(false);
      setDeletingJob(null);
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      toastApiError(error, tJobs("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-w-0 divide-y divide-slate-100 dark:divide-slate-800">
      <div className="px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{t("title")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
        <ListPageSearchField
          value={search}
          onCommit={commitSearch}
          placeholder={t("searchPlaceholder")}
          ariaLabel={t("searchAria")}
          className="sm:max-w-sm"
        />
        <CheckmarkSelect
          listLabel={tJobs("filterJobStatus")}
          buttonAriaLabel={tJobs("filterJobStatus")}
          options={jobStatusOptions}
          value={jobStatusFilter != null ? String(jobStatusFilter) : ""}
          emptyLabel={tJobs("filterAllStatuses")}
          portaled
          searchable
          clearable
          className="w-full min-w-0 sm:w-44"
          onChange={(v) => setJobStatusFilter(v ? Number.parseInt(v, 10) : undefined)}
        />
        {/* <CheckmarkSelect
          listLabel={t("filterJobSource")}
          buttonAriaLabel={t("filterJobSource")}
          options={jobSourceOptions}
          value={jobSourceFilter}
          portaled
          className="w-full min-w-0 sm:w-44"
          onChange={(v) => {
            setJobSourceFilter(
              v === "manual" ? "manual" : v === "quotation" ? "quotation" : DEFAULT_PROJECT_JOBS_SOURCE,
            );
            setLevelFilter(undefined);
            setPlotFilter(undefined);
          }}
        /> */}
        {/* {jobSourceFilter !== "manual" ? (
          <>
            <CheckmarkSelect
              listLabel={t("filterLevel")}
              buttonAriaLabel={t("filterLevel")}
              options={levelOptions}
              value={levelFilter != null ? String(levelFilter) : ""}
              emptyLabel={t("filterAllLevels")}
              portaled
              searchable
              clearable
              className="w-full min-w-0 sm:w-44"
              onChange={(v) => {
                setLevelFilter(v ? Number.parseInt(v, 10) : undefined);
                setPlotFilter(undefined);
              }}
            />
            <CheckmarkSelect
              listLabel={t("filterPlot")}
              buttonAriaLabel={t("filterPlot")}
              options={plotOptions}
              value={plotFilter != null ? String(plotFilter) : ""}
              emptyLabel={t("filterAllPlots")}
              portaled
              searchable
              clearable
              disabled={plotOptions.length === 0}
              className="w-full min-w-0 sm:w-44"
              onChange={(v) => setPlotFilter(v ? Number.parseInt(v, 10) : undefined)}
            />
          </>
        ) : null} */}
      </div>

      {mass.selectedCount > 0 && !loading && !loadError ? (
        <div className="px-4 sm:px-6">
          <MassActionBar
            selectedIds={mass.selectedIds}
            config={mass.config}
            updateFields={massUpdateFields}
            directUpdateActions={jobDirectUpdateActions}
            onSuccess={mass.handleMassSuccess}
          />
        </div>
      ) : null}

      <div className="p-6">
        {loadError ? (
          <p className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-400 sm:px-6">{loadError}</p>
          ) : loading ? (
          <SurfaceShell className="rounded-none border-0">
            <div className="overflow-auto px-4 py-6 sm:px-6">
              <div className="animate-pulse">
                <DataTableScroll>
                  <DataTable>
                    <DataTableBody>
                      {Array.from({ length: Math.max(3, Math.min(rowsPerPage, 10)) }).map((_, r) => (
                        <DataTableRow key={r}>
                          {tableColumns.map((col) => (
                            <DataTableTd key={col.id}>
                              <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
                            </DataTableTd>
                          ))}
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                </DataTableScroll>
              </div>
            </div>
          </SurfaceShell>
        ) : tableRows.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "jobStatus",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: null,
            }}
            onClearFilters={clearFilters}
          />
        ) : (
          <SurfaceShell className="rounded-none border-0">
            <EntityDataTable
              columns={tableColumns}
              rows={paginatedRows}
              onRowClick={(row) => openJobDetail(row.id)}
              getRowClassName={(row) => highlightClassName(row.id)}
              rowHighlightId={(row) => row.id}
              scrollClassName="rounded-none"
            />
            {tableRows.length > 0 && (
              <DataTablePaginationBar
                pagination={{ current_page: page + 1, total_pages: totalPages, total_records: tableRows.length }}
                summary={`Showing ${Math.min(page * rowsPerPage + 1, tableRows.length)}-${Math.min((page + 1) * rowsPerPage, tableRows.length)} of ${tableRows.length}`}
                prevLabel="Prev"
                nextLabel="Next"
                onPrev={() => setPage((p) => Math.max(0, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                onPageSelect={(p) => setPage(Math.max(0, Math.min(totalPages - 1, p - 1)))}
                pageSizeControl={{
                  listLabel: tList("rowsPerPage"),
                  buttonAriaLabel: tList("rowsPerPage"),
                  value: rowsPerPage,
                  options: [{ value: "5", label: "5" }, { value: "10", label: "10" }, { value: "20", label: "20" }, { value: "50", label: "50" }],
                  onChange: (n) => { setRowsPerPage(n); setPage(0); },
                }}
              />
            )}
          </SurfaceShell>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={tJobs("deleteConfirmTitle")}
        body={tJobs("deleteConfirmBody")}
        highlight={deletingJob?.title}
        confirmLabel={tJobs("confirmDelete")}
        cancelLabel={tJobs("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
