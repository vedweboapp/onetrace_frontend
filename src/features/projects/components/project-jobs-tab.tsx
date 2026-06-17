"use client";

import * as React from "react";
import { Layers, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchFormsPage } from "@/features/forms/api/forms.api";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import { deleteJob } from "@/features/jobs/api/job.api";
import { fetchProjectsPage, fetchProjectJobsHierarchy } from "@/features/projects/api/project.api";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { ProjectJobHierarchyJob } from "@/features/projects/types/project-jobs.types";
import {
  collectProjectJobLevelOptions,
  collectProjectJobPlotOptions,
  countFilteredProjectJobs,
  DEFAULT_PROJECT_JOBS_SOURCE,
  filterProjectJobsHierarchy,
  plotSelectionState,
  togglePlotJobSelection,
  type ProjectJobsSourceFilter,
} from "@/features/projects/utils/project-jobs-list.util";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import type { ListEmptyStateKind } from "@/shared/hooks/use-list-active-inactive-empty";
import {
  MassActionBar,
  buildJobMassUpdateFields,
  listMassSelectionRowCheckboxClassName,
  massActionConfigFor,
} from "@/shared/mass-actions";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { jobAssignedWorkerLabel } from "@/features/jobs/utils/job-nested-fields.util";
import {
  CheckmarkSelect,
  ConfirmDialog,
  ListPageEmptyStates,
  DataTableRowActionsMenu,
  ListPageSearchField,
} from "@/shared/ui";
import {
  buildDetailHrefWithListReturn,
  buildProjectJobsTabHref,
} from "@/shared/utils/detail-from-list.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  projectId: number;
};

/** Shared column layout: checkbox | title | description | assigned worker | status | start | end | actions */
const JOB_TABLE_GRID =
  "grid w-full max-w-full grid-cols-[1.125rem_minmax(0,1.1fr)_minmax(0,1fr)_7.5rem_7.5rem_6.5rem_6.5rem_2.25rem] items-center gap-x-3 sm:gap-x-4";

function TruncatedCell({
  children,
  title,
  className,
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span className={cn("block min-w-0 truncate", className)} title={title}>
      {children}
    </span>
  );
}

const JOB_TABLE_HEADER_CLASS = cn(
  JOB_TABLE_GRID,
  "border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
);

const JOB_TABLE_ROW_CLASS = cn(
  JOB_TABLE_GRID,
  "px-4 py-3 text-sm transition-colors",
);

type GroupCheckboxProps = {
  jobIds: number[];
  selectedIds: ReadonlySet<number>;
  onToggle: (jobIds: number[]) => void;
  ariaLabel: string;
  className?: string;
};

function GroupCheckbox({ jobIds, selectedIds, onToggle, ariaLabel, className }: GroupCheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  const state = plotSelectionState(jobIds, selectedIds);

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "partial";
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={className}
      checked={state === "all"}
      disabled={jobIds.length === 0}
      aria-label={ariaLabel}
      onChange={() => onToggle(jobIds)}
    />
  );
}

type JobRowProps = {
  job: ProjectJobHierarchyJob;
  selected: boolean;
  onToggleSelected: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  statusChip: React.ReactNode;
  workerLabel: React.ReactNode;
  selectAriaLabel: string;
  rowClassName?: string;
  tJobs: ReturnType<typeof useTranslations<"Dashboard.jobs">>;
  tList: ReturnType<typeof useTranslations<"Dashboard.list">>;
  dateFmt: Intl.DateTimeFormat;
};

function ProjectJobRow({
  job,
  selected,
  onToggleSelected,
  onOpen,
  onEdit,
  onDelete,
  statusChip,
  workerLabel,
  selectAriaLabel,
  rowClassName,
  tJobs,
  tList,
  dateFmt,
}: JobRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        JOB_TABLE_ROW_CLASS,
        "cursor-pointer hover:bg-slate-50/90 dark:hover:bg-slate-800/30",
        rowClassName,
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-[3px] border-slate-300 accent-[color:var(--dash-accent,#111)] dark:border-slate-600 dark:bg-slate-900"
        checked={selected}
        aria-label={selectAriaLabel}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onToggleSelected();
        }}
      />
      <TruncatedCell title={job.title} className="font-medium text-slate-900 dark:text-slate-100">
        {job.title}
      </TruncatedCell>
      <TruncatedCell
        title={job.description?.trim() || undefined}
        className="text-xs text-slate-500 dark:text-slate-400"
      >
        {job.description?.trim() || "—"}
      </TruncatedCell>
      <TruncatedCell className="text-xs text-slate-600 dark:text-slate-400">{workerLabel}</TruncatedCell>
      <div className="min-w-0 overflow-hidden">{statusChip}</div>
      <TruncatedCell className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
        {formatFlexibleApiDate(job.start_date, dateFmt)}
      </TruncatedCell>
      <TruncatedCell className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
        {formatFlexibleApiDate(job.completed_at, dateFmt)}
      </TruncatedCell>
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <DataTableRowActionsMenu
          menuAriaLabel={tList("openRowActions")}
          items={[
            { id: "edit", label: tJobs("edit"), icon: Pencil, onSelect: onEdit },
            {
              id: "delete",
              label: tJobs("delete"),
              icon: Trash2,
              tone: "danger",
              onSelect: onDelete,
            },
          ]}
        />
      </div>
    </div>
  );
}

type JobTableHeaderProps = {
  tJobs: JobRowProps["tJobs"];
};

function ProjectJobTableHeader({ tJobs }: JobTableHeaderProps) {
  return (
    <div className={JOB_TABLE_HEADER_CLASS}>
      <span aria-hidden />
      <span>{tJobs("table.title")}</span>
      <span>{tJobs("fields.description")}</span>
      <span>{tJobs("fields.assignedWorker")}</span>
      <span>{tJobs("table.jobStatus")}</span>
      <span>{tJobs("table.start")}</span>
      <span>{tJobs("table.end")}</span>
      <span aria-hidden />
    </div>
  );
}

type PlotJobsBlockProps = {
  plotName: string;
  plotJobIds: number[];
  jobs: ProjectJobHierarchyJob[];
  selectedIds: ReadonlySet<number>;
  onTogglePlot: (jobIds: number[]) => void;
  selectPlotAria: string;
  plotJobCountLabel: string;
  checkboxClassName: string;
  highlightClassName: (id: number) => string | undefined;
  onToggleJob: (id: number) => void;
  onOpenJob: (id: number) => void;
  onEditJob: (job: ProjectJobHierarchyJob) => void;
  onDeleteJob: (job: ProjectJobHierarchyJob) => void;
  statusChipForJob: (job: ProjectJobHierarchyJob) => React.ReactNode;
  workerLabelById: Record<number, string>;
  selectRowAria: string;
  tJobs: JobRowProps["tJobs"];
  tList: JobRowProps["tList"];
  dateFmt: Intl.DateTimeFormat;
};

function PlotJobsBlock({
  plotName,
  plotJobIds,
  jobs,
  selectedIds,
  onTogglePlot,
  selectPlotAria,
  plotJobCountLabel,
  checkboxClassName,
  highlightClassName,
  onToggleJob,
  onOpenJob,
  onEditJob,
  onDeleteJob,
  statusChipForJob,
  workerLabelById,
  selectRowAria,
  tJobs,
  tList,
  dateFmt,
}: PlotJobsBlockProps) {
  return (
    <div className="max-w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-950/30">
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950/40">
        <GroupCheckbox
          jobIds={plotJobIds}
          selectedIds={selectedIds}
          onToggle={onTogglePlot}
          ariaLabel={selectPlotAria}
          className={checkboxClassName}
        />
        <Layers className="size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
        <span className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{plotName}</span>
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {plotJobCountLabel}
        </span>
      </div>
      <div className="min-w-0 max-w-full overflow-hidden">
        <ProjectJobTableHeader tJobs={tJobs} />
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {jobs.map((job) => (
            <ProjectJobRow
              key={job.id}
              job={job}
              selected={selectedIds.has(job.id)}
              onToggleSelected={() => onToggleJob(job.id)}
              onOpen={() => onOpenJob(job.id)}
              onEdit={() => onEditJob(job)}
              onDelete={() => onDeleteJob(job)}
              statusChip={statusChipForJob(job)}
              workerLabel={jobAssignedWorkerLabel(job, workerLabelById)}
              selectAriaLabel={selectRowAria}
              rowClassName={highlightClassName(job.id)}
              tJobs={tJobs}
              tList={tList}
              dateFmt={dateFmt}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectJobsTab({ projectId }: Props) {
  const t = useTranslations("Dashboard.projects.jobsTab");
  const tJobs = useTranslations("Dashboard.jobs");
  const tList = useTranslations("Dashboard.list");
  const tMass = useTranslations("Dashboard.massActions");
  const dateFmt = useDashboardDateFormat();
  const router = useRouter();
  const pathname = usePathname();
  const { highlightClassName } = useListRowHighlight();
  const massConfig = React.useMemo(() => massActionConfigFor("jobs"), []);

  const listBack = React.useMemo(() => buildProjectJobsTabHref(pathname), [pathname]);

  const openJobDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${routes.dashboard.jobs}/${id}`, listBack, id));
    },
    [listBack, router],
  );

  const [search, setSearch] = React.useState("");
  const [jobStatusFilter, setJobStatusFilter] = React.useState<number | undefined>();
  const [jobSourceFilter, setJobSourceFilter] = React.useState<ProjectJobsSourceFilter>(
    DEFAULT_PROJECT_JOBS_SOURCE,
  );
  const [levelFilter, setLevelFilter] = React.useState<number | undefined>();
  const [plotFilter, setPlotFilter] = React.useState<number | undefined>();
  const isManualSource = jobSourceFilter === "manual";

  const [hierarchy, setHierarchy] = React.useState<Awaited<ReturnType<typeof fetchProjectJobsHierarchy>> | null>(
    null,
  );
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

  const workerLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of workerOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [workerOptions]);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingJob, setDeletingJob] = React.useState<ProjectJobHierarchyJob | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const listFilters = React.useMemo(
    () => ({
      search: search || undefined,
      job_status: jobStatusFilter,
      job_source: jobSourceFilter,
      level_id: levelFilter,
      plot_id: plotFilter,
    }),
    [search, jobStatusFilter, jobSourceFilter, levelFilter, plotFilter],
  );

  const filteredHierarchy = React.useMemo(
    () => (hierarchy ? filterProjectJobsHierarchy(hierarchy, listFilters) : { levels: [], manual_jobs: [] }),
    [hierarchy, listFilters],
  );

  const totalJobs = React.useMemo(() => countFilteredProjectJobs(filteredHierarchy), [filteredHierarchy]);

  const levelOptions = React.useMemo(
    () => (hierarchy ? collectProjectJobLevelOptions(hierarchy) : []),
    [hierarchy],
  );

  const plotOptions = React.useMemo(
    () => (hierarchy ? collectProjectJobPlotOptions(hierarchy, levelFilter) : []),
    [hierarchy, levelFilter],
  );

  const jobSourceOptions = React.useMemo(
    () => [
      { value: DEFAULT_PROJECT_JOBS_SOURCE, label: t("filterQuotationSource") },
      { value: "manual", label: t("filterManualSource") },
    ],
    [t],
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
          title: tJobs("fields.title"),
          description: tJobs("fields.description"),
          client: tJobs("fields.client"),
          project: tJobs("fields.project"),
          site: tJobs("fields.site"),
          forms: tJobs("fields.forms"),
          jobStatus: tJobs("fields.jobStatus"),
          assignedWorker: tJobs("fields.assignedWorker"),
          startDate: tJobs("fields.startDate"),
        },
      ),
    [workerOptions, jobStatusOptions, massClientOptions, massProjectOptions, massSiteOptions, massFormOptions, tJobs],
  );

  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(() => new Set());
  const checkboxClassName = listMassSelectionRowCheckboxClassName;
  const selectedCount = selectedIds.size;
  const selectedIdsList = React.useMemo(() => [...selectedIds], [selectedIds]);

  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [search, jobStatusFilter, jobSourceFilter, levelFilter, plotFilter]);

  const handleMassSuccess = React.useCallback(() => {
    toastSuccess(tMass("success"));
    setSelectedIds(new Set());
    setRefreshNonce((n) => n + 1);
  }, [tMass]);

  const handleTogglePlot = React.useCallback((jobIds: number[]) => {
    setSelectedIds((prev) => togglePlotJobSelection(jobIds, prev));
  }, []);

  const handleToggleJob = React.useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const commitSearch = React.useCallback((q: string) => {
    setSearch(q.trim());
  }, []);

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
          setWorkerOptions(workers);
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
          setJobStatusOptions([]);
          setMassClientOptions([]);
          setMassProjectOptions([]);
          setMassSiteOptions([]);
          setMassFormOptions([]);
          setWorkerOptions([]);
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
        const data = await fetchProjectJobsHierarchy(projectId, { silent: true });
        if (!cancelled) setHierarchy(data);
      } catch {
        if (!cancelled) {
          setLoadError(t("loadError"));
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

  function openEdit(job: ProjectJobHierarchyJob) {
    router.push(`${routes.dashboard.jobs}/${job.id}/edit?back=${encodeURIComponent(listBack)}`);
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
    } catch {
      toastError(tJobs("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  function statusChipForJob(job: ProjectJobHierarchyJob) {
    const status = job.status;
    if (!status) return <span className="text-sm text-slate-500">—</span>;
    const cached = statusById[status.id];
    if (cached) return <WorkflowColourStatusChip row={cached} />;
    if (status.name?.trim()) {
      return <span className="text-sm capitalize text-slate-600 dark:text-slate-400">{status.name}</span>;
    }
    return <span className="text-sm text-slate-500">—</span>;
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    jobStatusFilter != null ||
    isManualSource ||
    levelFilter != null ||
    plotFilter != null;

  const emptyStateKind: ListEmptyStateKind = React.useMemo(() => {
    if (loading || loadError || totalJobs > 0) return "none";
    if (hasActiveFilters) return "filtered";
    return "onboarding";
  }, [loading, loadError, totalJobs, hasActiveFilters]);

  function clearFilters() {
    setSearch("");
    setJobStatusFilter(undefined);
    setJobSourceFilter(DEFAULT_PROJECT_JOBS_SOURCE);
    setLevelFilter(undefined);
    setPlotFilter(undefined);
  }

  const manualJobIds = React.useMemo(
    () => filteredHierarchy.manual_jobs.map((job) => job.id),
    [filteredHierarchy.manual_jobs],
  );

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
        <CheckmarkSelect
          listLabel={t("filterJobSource")}
          buttonAriaLabel={t("filterJobSource")}
          options={jobSourceOptions}
          value={jobSourceFilter}
          portaled
          className="w-full min-w-0 sm:w-44"
          onChange={(v) => {
            const next =
              v === "manual" ? "manual" : DEFAULT_PROJECT_JOBS_SOURCE;
            setJobSourceFilter(next);
            setLevelFilter(undefined);
            setPlotFilter(undefined);
          }}
        />
        {!isManualSource ? (
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
        ) : null}
      </div>

      {selectedCount > 0 && !loading && !loadError ? (
        <div className="px-4 sm:px-6">
          <MassActionBar
            selectedIds={selectedIdsList}
            config={massConfig}
            updateFields={massUpdateFields}
            onSuccess={handleMassSuccess}
          />
        </div>
      ) : null}

      <div>
        {loadError ? (
          <p className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-400 sm:px-6">{loadError}</p>
        ) : loading ? (
          <div className="space-y-4 p-4 sm:p-6">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : totalJobs === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "jobStatus",
              title: isManualSource ? t("emptyManualTitle") : t("emptyQuotationTitle"),
              description: isManualSource ? t("emptyManualDescription") : t("emptyQuotationDescription"),
              action: null,
            }}
            onClearFilters={clearFilters}
          />
        ) : (
          <div className="space-y-8 px-4 py-4 sm:px-6 sm:py-6">
            {filteredHierarchy.levels.map((level) => (
              <section key={level.id} className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-[color:var(--dash-accent,#f97316)]" aria-hidden />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    {level.name}
                  </h3>
                </div>
                <div className="space-y-4">
                  {level.plots.map((plot) => (
                    <PlotJobsBlock
                      key={`${level.id}-${plot.id}`}
                      plotName={plot.name}
                      plotJobIds={plot.jobs.map((job) => job.id)}
                      jobs={plot.jobs}
                      selectedIds={selectedIds}
                      onTogglePlot={handleTogglePlot}
                      selectPlotAria={t("selectPlot", { plot: plot.name })}
                      plotJobCountLabel={t("plotJobCount", { count: plot.jobs.length })}
                      checkboxClassName={checkboxClassName}
                      highlightClassName={highlightClassName}
                      onToggleJob={handleToggleJob}
                      onOpenJob={openJobDetail}
                      onEditJob={openEdit}
                      onDeleteJob={(job) => {
                        setDeletingJob(job);
                        setDeleteOpen(true);
                      }}
                      statusChipForJob={statusChipForJob}
                      workerLabelById={workerLabelById}
                      selectRowAria={tMass("selectRow")}
                      tJobs={tJobs}
                      tList={tList}
                      dateFmt={dateFmt}
                    />
                  ))}
                </div>
              </section>
            ))}

            {filteredHierarchy.manual_jobs.length > 0 ? (
              <section>
                <PlotJobsBlock
                  plotName={t("manualJobsSection")}
                  plotJobIds={manualJobIds}
                  jobs={filteredHierarchy.manual_jobs}
                  selectedIds={selectedIds}
                  onTogglePlot={handleTogglePlot}
                  selectPlotAria={t("selectManualJobs")}
                  plotJobCountLabel={t("plotJobCount", { count: filteredHierarchy.manual_jobs.length })}
                  checkboxClassName={checkboxClassName}
                  highlightClassName={highlightClassName}
                  onToggleJob={handleToggleJob}
                  onOpenJob={openJobDetail}
                  onEditJob={openEdit}
                  onDeleteJob={(job) => {
                    setDeletingJob(job);
                    setDeleteOpen(true);
                  }}
                  statusChipForJob={statusChipForJob}
                  workerLabelById={workerLabelById}
                  selectRowAria={tMass("selectRow")}
                  tJobs={tJobs}
                  tList={tList}
                  dateFmt={dateFmt}
                />
              </section>
            ) : null}
          </div>
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

