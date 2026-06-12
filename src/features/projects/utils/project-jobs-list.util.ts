import type {
  ProjectJobHierarchyJob,
  ProjectJobListItem,
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

export const DEFAULT_PROJECT_JOBS_SOURCE = "quotation" as const;
export type ProjectJobsSourceFilter = typeof DEFAULT_PROJECT_JOBS_SOURCE | "manual";

export function resolveProjectJobsSource(param: string | null | undefined): ProjectJobsSourceFilter {
  return param === "manual" ? "manual" : DEFAULT_PROJECT_JOBS_SOURCE;
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
      level_id: null,
      level_name: null,
      plot_id: null,
      plot_name: null,
    });
  }

  return items;
}

export function collectProjectJobLevelOptions(
  data: ProjectJobsHierarchyData,
): { value: string; label: string }[] {
  return (data.levels ?? []).map((level) => ({
    value: String(level.id),
    label: level.name,
  }));
}

export function collectProjectJobPlotOptions(
  data: ProjectJobsHierarchyData,
  levelId?: number,
): { value: string; label: string }[] {
  const levels = data.levels ?? [];
  const source = levelId != null ? levels.filter((l) => l.id === levelId) : levels;
  const seen = new Set<number>();
  const options: { value: string; label: string }[] = [];

  for (const level of source) {
    for (const plot of level.plots ?? []) {
      if (seen.has(plot.id)) continue;
      seen.add(plot.id);
      options.push({ value: String(plot.id), label: plot.name });
    }
  }

  return options;
}

function jobMatchesFilters(
  job: ProjectJobHierarchyJob,
  filters: ProjectJobsListFilters,
  context?: { levelName?: string | null; plotName?: string | null },
): boolean {
  if (filters.job_status != null && job.status?.id !== filters.job_status) return false;
  if (filters.job_source && job.job_source !== filters.job_source) return false;

  const search = filters.search?.trim().toLowerCase() ?? "";
  if (search) {
    const hay = [
      job.title,
      job.description,
      context?.levelName,
      context?.plotName,
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
    const manual_jobs = (data.manual_jobs ?? []).filter((job) => jobMatchesFilters(job, scopedFilters));
    return { levels: [], manual_jobs };
  }

  const levels = (data.levels ?? [])
    .filter((level) => filters.level_id == null || level.id === filters.level_id)
    .map((level) => {
      const plots = (level.plots ?? [])
        .filter((plot) => filters.plot_id == null || plot.id === filters.plot_id)
        .map((plot) => ({
          id: plot.id,
          name: plot.name,
          jobs: (plot.jobs ?? []).filter((job) =>
            jobMatchesFilters(job, scopedFilters, { levelName: level.name, plotName: plot.name }),
          ),
        }))
        .filter((plot) => plot.jobs.length > 0);

      return { id: level.id, name: level.name, plots };
    })
    .filter((level) => level.plots.length > 0);

  return { levels, manual_jobs: [] };
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
