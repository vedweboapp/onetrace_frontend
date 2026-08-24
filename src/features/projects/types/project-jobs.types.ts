export type ProjectJobHierarchyStatus = {
  id: number;
  name: string;
};

export type ProjectJobHierarchyJob = {
  id: number;
  title: string;
  job_serial_number?: string;
  description: string | null;
  job_source: string;
  client?:
    | number
    | {
        id: number;
        name?: string;
        contact_person?: string | null;
        email?: string | null;
        phone?: string | null;
      };
  /** Present in some backends so we can show assigned worker + support filtering/updates. */
  assigned_worker?:
    | number
    | {
        id: number;
        name?: string;
        first_name?: string;
        last_name?: string;
        username?: string;
        email?: string;
        phone?: string | null;
        phone_number?: string | null;
      }
    | Array<
        | number
        | {
            id: number;
            name?: string;
            first_name?: string;
            last_name?: string;
            username?: string;
            email?: string;
            phone?: string | null;
            phone_number?: string | null;
          }
      >;
  assigned_workers?: Array<
    | number
    | {
        id: number;
        name?: string;
        first_name?: string;
        last_name?: string;
        username?: string;
        email?: string;
        phone?: string | null;
        phone_number?: string | null;
      }
  > | null;
  status: ProjectJobHierarchyStatus | null;
  start_date: string | null;
  completed_at: string | null;
  /** Populated when API returns jobs as a flat list with embedded `levels`. */
  level_id?: number | null;
  level_name?: string | null;
  plot_id?: number | null;
  plot_name?: string | null;
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
  data: ProjectJobsHierarchyData | ProjectJobHierarchyJob[];
};
