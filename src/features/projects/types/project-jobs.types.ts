export type ProjectJobHierarchyStatus = {
  id: number;
  name: string;
};

export type ProjectJobHierarchyJob = {
  id: number;
  title: string;
  description: string | null;
  job_source: string;
  status: ProjectJobHierarchyStatus | null;
  start_date: string | null;
  completed_at: string | null;
};

export type ProjectJobPlot = {
  id: number;
  name: string;
  jobs: ProjectJobHierarchyJob[];
};

export type ProjectJobLevel = {
  id: number;
  name: string;
  plots: ProjectJobPlot[];
};

export type ProjectJobsHierarchyData = {
  levels: ProjectJobLevel[];
  manual_jobs: ProjectJobHierarchyJob[];
};

export type ProjectJobListItem = ProjectJobHierarchyJob & {
  level_id: number | null;
  level_name: string | null;
  plot_id: number | null;
  plot_name: string | null;
};

export type ProjectJobsHierarchyResponse = {
  success: boolean;
  message?: string;
  data: ProjectJobsHierarchyData;
};
