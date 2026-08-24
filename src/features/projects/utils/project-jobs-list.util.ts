import type {
  ProjectJobHierarchyJob,
  ProjectJobLevel,
  ProjectJobListItem,
  ProjectJobPlot,
  ProjectJobsHierarchyData,
} from "@/features/projects/types/project-jobs.types";

export type FilteredProjectJobPlot = {
  id: number;
  name: string;
  jobs: ProjectJobHierarchyJob[];
};

export type FilteredProjectJobLevel = {
  id: number;
  name: string;
  plots: FilteredProjectJobPlot[];
};

export type FilteredProjectJobsHierarchy = {
  levels: FilteredProjectJobLevel[];
  manual_jobs: ProjectJobHierarchyJob[];
};

export type PlotSelectionState = "none" | "partial" | "all";

export const DEFAULT_PROJECT_JOBS_SOURCE = "all" as const;
export type ProjectJobsSourceFilter =
  | typeof DEFAULT_PROJECT_JOBS_SOURCE
  | "quotation"
  | "manual";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inferJobSource(raw: Record<string, unknown>): string {
  if (typeof raw.job_source === "string" && raw.job_source.trim()) return raw.job_source.trim();
  const levels = raw.levels;
  if (Array.isArray(levels) && levels.length > 0) return "quotation";
  return "manual";
}

function extractJobLocation(raw: Record<string, unknown>): Pick<
  ProjectJobHierarchyJob,
  "level_id" | "level_name" | "plot_id" | "plot_name"
> {
  const levels = raw.levels;
  if (!Array.isArray(levels) || levels.length === 0) {
    return { level_id: null, level_name: null, plot_id: null, plot_name: null };
  }

  const level = levels[0];
  if (!isRecord(level)) {
    return { level_id: null, level_name: null, plot_id: null, plot_name: null };
  }

  const levelId = Number(level.id);
  const levelName = typeof level.name === "string" ? level.name : null;
  const plots = level.plots;
  if (!Array.isArray(plots) || plots.length === 0 || !isRecord(plots[0])) {
    return {
      level_id: Number.isFinite(levelId) ? levelId : null,
      level_name: levelName,
      plot_id: null,
      plot_name: null,
    };
  }

  const plot = plots[0];
  const plotId = Number(plot.id);
  return {
    level_id: Number.isFinite(levelId) ? levelId : null,
    level_name: levelName,
    plot_id: Number.isFinite(plotId) ? plotId : null,
    plot_name: typeof plot.name === "string" ? plot.name : null,
  };
}

function coerceJob(raw: unknown): ProjectJobHierarchyJob | null {
  if (!isRecord(raw)) return null;
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;

  const serial =
    typeof raw.job_serial_number === "string"
      ? raw.job_serial_number.trim()
      : typeof raw.serial_number === "string"
        ? raw.serial_number.trim()
        : "";

  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : serial || `Job #${id}`;

  return {
    id,
    title,
    job_serial_number: serial || undefined,
    description: typeof raw.description === "string" ? raw.description : null,
    job_source: inferJobSource(raw),
    client: raw.client as ProjectJobHierarchyJob["client"],
    assigned_worker: raw.assigned_worker as ProjectJobHierarchyJob["assigned_worker"],
    assigned_workers: raw.assigned_workers as ProjectJobHierarchyJob["assigned_workers"],
    status: coerceJobStatus(raw.status ?? raw.job_status),
    start_date: typeof raw.start_date === "string" ? raw.start_date : null,
    completed_at: typeof raw.completed_at === "string" ? raw.completed_at : null,
    ...extractJobLocation(raw),
  };
}

function normalizeProjectJobsArray(items: unknown[]): ProjectJobsHierarchyData {
  const manual_jobs = items
    .map(coerceJob)
    .filter((job): job is ProjectJobHierarchyJob => job != null);

  return { levels: [], manual_jobs };
}

function coercePlot(raw: unknown): ProjectJobPlot | null {
  if (!isRecord(raw)) return null;
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const name = typeof raw.name === "string" ? raw.name : `Plot ${id}`;
  const jobs = Array.isArray(raw.jobs) ? raw.jobs.map(coerceJob).filter((job): job is ProjectJobHierarchyJob => job != null) : [];
  return { id, name, jobs };
}

function coerceLevel(raw: unknown): ProjectJobLevel | null {
  if (!isRecord(raw)) return null;
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const name = typeof raw.name === "string" ? raw.name : `Level ${id}`;
  const plots = Array.isArray(raw.plots) ? raw.plots.map(coercePlot).filter((plot): plot is ProjectJobPlot => plot != null) : [];
  return { id, name, plots };
}

/** Normalizes hierarchy and flat list shapes from the project jobs API. */
export function normalizeProjectJobsHierarchy(payload: unknown): ProjectJobsHierarchyData {
  if (Array.isArray(payload)) {
    return normalizeProjectJobsArray(payload);
  }

  if (!isRecord(payload)) return { levels: [], manual_jobs: [] };

  if (Array.isArray(payload.data)) {
    return normalizeProjectJobsArray(payload.data);
  }

  if (isRecord(payload.data)) {
    return normalizeProjectJobsHierarchy(payload.data);
  }

  const levels = Array.isArray(payload.levels)
    ? payload.levels.map(coerceLevel).filter((level): level is ProjectJobLevel => level != null)
    : [];
  const manual_jobs = Array.isArray(payload.manual_jobs)
    ? payload.manual_jobs.map(coerceJob).filter((job): job is ProjectJobHierarchyJob => job != null)
    : [];

  if (levels.length > 0 || manual_jobs.length > 0) {
    return { levels, manual_jobs };
  }

  for (const candidate of [payload.jobs, payload.results, payload.items]) {
    if (!Array.isArray(candidate) || candidate.length === 0) continue;
    return normalizeProjectJobsArray(candidate);
  }

  return { levels: [], manual_jobs: [] };
}

function coerceJobStatus(raw: unknown): ProjectJobHierarchyJob["status"] {
  if (!isRecord(raw)) return null;
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const name = typeof raw.name === "string" ? raw.name : typeof raw.status_name === "string" ? raw.status_name : "";
  return { id, name };
}

export function resolveProjectJobsSource(param: string | null | undefined): ProjectJobsSourceFilter {
  if (param === "manual") return "manual";
  if (param === "quotation") return "quotation";
  return DEFAULT_PROJECT_JOBS_SOURCE;
}

function matchesJobSourceFilter(job: ProjectJobHierarchyJob, source?: string): boolean {
  if (!source || source === DEFAULT_PROJECT_JOBS_SOURCE) return true;
  const isManual = job.job_source === "manual";
  if (source === "manual") return isManual;
  if (source === "quotation") return !isManual;
  return job.job_source === source;
}

export type ProjectJobsListFilters = {
  search?: string;
  job_status?: number;
  job_source?: string;
  level_id?: number;
  plot_id?: number;
};

export function flattenProjectJobsHierarchy(data: ProjectJobsHierarchyData): ProjectJobListItem[] {
  const items: ProjectJobListItem[] = [];

  for (const level of data.levels ?? []) {
    for (const plot of level.plots ?? []) {
      for (const job of plot.jobs ?? []) {
        items.push({
          ...job,
          level_id: level.id,
          level_name: level.name,
          plot_id: plot.id,
          plot_name: plot.name,
        });
      }
    }
  }

  for (const job of data.manual_jobs ?? []) {
    items.push({
      ...job,
      level_id: job.level_id ?? null,
      level_name: job.level_name ?? null,
      plot_id: job.plot_id ?? null,
      plot_name: job.plot_name ?? null,
    });
  }

  return items;
}

export function collectProjectJobLevelOptions(
  data: ProjectJobsHierarchyData,
): { value: string; label: string }[] {
  const seen = new Map<number, string>();

  for (const level of data.levels ?? []) {
    seen.set(level.id, level.name);
  }

  for (const job of data.manual_jobs ?? []) {
    if (job.level_id != null && job.level_name) {
      seen.set(job.level_id, job.level_name);
    }
  }

  return [...seen.entries()].map(([id, name]) => ({ value: String(id), label: name }));
}

export function collectProjectJobPlotOptions(
  data: ProjectJobsHierarchyData,
  levelId?: number,
): { value: string; label: string }[] {
  const seen = new Map<number, string>();

  const levels = data.levels ?? [];
  const sourceLevels = levelId != null ? levels.filter((level) => level.id === levelId) : levels;

  for (const level of sourceLevels) {
    for (const plot of level.plots ?? []) {
      seen.set(plot.id, plot.name);
    }
  }

  for (const job of data.manual_jobs ?? []) {
    if (levelId != null && job.level_id !== levelId) continue;
    if (job.plot_id != null && job.plot_name) {
      seen.set(job.plot_id, job.plot_name);
    }
  }

  return [...seen.entries()].map(([id, name]) => ({ value: String(id), label: name }));
}

function manualJobMatchesLocation(job: ProjectJobHierarchyJob, filters: ProjectJobsListFilters): boolean {
  if (filters.level_id != null && job.level_id !== filters.level_id) return false;
  if (filters.plot_id != null && job.plot_id !== filters.plot_id) return false;
  return true;
}

function filterManualJobsList(
  jobs: ProjectJobHierarchyJob[],
  filters: ProjectJobsListFilters,
  source?: ProjectJobsSourceFilter,
): ProjectJobHierarchyJob[] {
  const scopedFilters: ProjectJobsListFilters = {
    ...filters,
    job_source: source && source !== DEFAULT_PROJECT_JOBS_SOURCE ? source : undefined,
  };

  return jobs.filter((job) => {
    if (!manualJobMatchesLocation(job, filters)) return false;
    return jobMatchesFilters(job, scopedFilters, {
      levelName: job.level_name,
      plotName: job.plot_name,
    });
  });
}

function jobMatchesFilters(
  job: ProjectJobHierarchyJob,
  filters: ProjectJobsListFilters,
  context?: { levelName?: string | null; plotName?: string | null },
): boolean {
  if (filters.job_status != null && job.status?.id !== filters.job_status) return false;
  if (!matchesJobSourceFilter(job, filters.job_source)) return false;

  const search = filters.search?.trim().toLowerCase() ?? "";
  if (search) {
    const hay = [
      job.title,
      job.job_serial_number,
      job.description,
      context?.levelName ?? job.level_name,
      context?.plotName ?? job.plot_name,
      job.status?.name,
      job.job_source,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(search)) return false;
  }

  return true;
}

export function filterProjectJobsHierarchy(
  data: ProjectJobsHierarchyData,
  filters: ProjectJobsListFilters,
): FilteredProjectJobsHierarchy {
  const source = resolveProjectJobsSource(filters.job_source);
  const scopedFilters: ProjectJobsListFilters = { ...filters, job_source: undefined };

  if (source === "manual") {
    return {
      levels: [],
      manual_jobs: filterManualJobsList(data.manual_jobs ?? [], filters, "manual"),
    };
  }

  const levelFilters: ProjectJobsListFilters = {
    ...scopedFilters,
    job_source: source === "quotation" ? "quotation" : undefined,
  };

  const levels = (data.levels ?? [])
    .filter((level) => filters.level_id == null || level.id === filters.level_id)
    .map((level) => {
      const plots = (level.plots ?? [])
        .filter((plot) => filters.plot_id == null || plot.id === filters.plot_id)
        .map((plot) => ({
          id: plot.id,
          name: plot.name,
          jobs: (plot.jobs ?? []).filter((job) =>
            jobMatchesFilters(job, levelFilters, { levelName: level.name, plotName: plot.name }),
          ),
        }))
        .filter((plot) => plot.jobs.length > 0);

      return { id: level.id, name: level.name, plots };
    })
    .filter((level) => level.plots.length > 0);

  const manual_jobs = filterManualJobsList(
    data.manual_jobs ?? [],
    filters,
    source === "quotation" ? "quotation" : DEFAULT_PROJECT_JOBS_SOURCE,
  );

  return { levels, manual_jobs };
}

export function collectJobIdsFromFilteredHierarchy(filtered: FilteredProjectJobsHierarchy): number[] {
  const ids: number[] = [];
  for (const level of filtered.levels) {
    for (const plot of level.plots) {
      for (const job of plot.jobs) ids.push(job.id);
    }
  }
  for (const job of filtered.manual_jobs) ids.push(job.id);
  return ids;
}

export function flattenFilteredHierarchyToListItems(
  filtered: FilteredProjectJobsHierarchy,
): ProjectJobListItem[] {
  const rows: ProjectJobListItem[] = [];

  for (const level of filtered.levels) {
    for (const plot of level.plots) {
      for (const job of plot.jobs) {
        rows.push({
          ...job,
          level_id: level.id,
          level_name: level.name,
          plot_id: plot.id,
          plot_name: plot.name,
        });
      }
    }
  }

  for (const job of filtered.manual_jobs) {
    rows.push({
      ...job,
      level_id: job.level_id ?? null,
      level_name: job.level_name ?? null,
      plot_id: job.plot_id ?? null,
      plot_name: job.plot_name ?? null,
    });
  }

  return rows;
}

export function flattenFilteredProjectJobs(filtered: FilteredProjectJobsHierarchy): ProjectJobHierarchyJob[] {
  const jobs: ProjectJobHierarchyJob[] = [];
  for (const level of filtered.levels) {
    for (const plot of level.plots) {
      jobs.push(...plot.jobs);
    }
  }
  jobs.push(...filtered.manual_jobs);
  return jobs;
}

export function plotSelectionState(jobIds: number[], selectedIds: ReadonlySet<number>): PlotSelectionState {
  if (jobIds.length === 0) return "none";
  const selectedCount = jobIds.filter((id) => selectedIds.has(id)).length;
  if (selectedCount === 0) return "none";
  if (selectedCount === jobIds.length) return "all";
  return "partial";
}

export function togglePlotJobSelection(jobIds: number[], selectedIds: ReadonlySet<number>): Set<number> {
  const next = new Set(selectedIds);
  if (plotSelectionState(jobIds, selectedIds) === "all") {
    for (const id of jobIds) next.delete(id);
  } else {
    for (const id of jobIds) next.add(id);
  }
  return next;
}

export function filterProjectJobsList(
  items: ProjectJobListItem[],
  filters: ProjectJobsListFilters,
): ProjectJobListItem[] {
  return items.filter((row) => {
    if (filters.level_id != null && row.level_id !== filters.level_id) return false;
    if (filters.plot_id != null && row.plot_id !== filters.plot_id) return false;
    return jobMatchesFilters(row, filters, {
      levelName: row.level_name,
      plotName: row.plot_name,
    });
  });
}

export function countFilteredProjectJobs(filtered: FilteredProjectJobsHierarchy): number {
  return collectJobIdsFromFilteredHierarchy(filtered).length;
}

export function paginateProjectJobsList<T>(
  rows: T[],
  page: number,
  pageSize: number,
): {
  items: T[];
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
} {
  const total_records = rows.length;
  const total_pages = Math.max(1, Math.ceil(total_records / pageSize));
  const current_page = Math.min(Math.max(1, page), total_pages);
  const start = (current_page - 1) * pageSize;

  return {
    items: rows.slice(start, start + pageSize),
    total_records,
    total_pages,
    current_page,
    page_size: pageSize,
    next: current_page < total_pages ? String(current_page + 1) : null,
    previous: current_page > 1 ? String(current_page - 1) : null,
  };
}

export function hasProjectJobsActiveFilters(args: {
  search: string;
  jobStatusParam?: string | null;
  jobSourceParam?: string | null;
  levelParam?: string | null;
  plotParam?: string | null;
}): boolean {
  if (args.search.trim() !== "") return true;
  if (args.jobStatusParam != null && args.jobStatusParam.trim() !== "") return true;
  if (args.jobSourceParam === "manual") return true;
  if (args.levelParam != null && args.levelParam.trim() !== "") return true;
  if (args.plotParam != null && args.plotParam.trim() !== "") return true;
  return false;
}
