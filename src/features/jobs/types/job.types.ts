import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";

export type JobUserRef = {
  id: number;
  email: string;
  username: string;
};

export type JobAssignedWorkerRef = {
  id: number;
  email?: string;
  username?: string;
  first_name?: string | null;
  last_name?: string | null;
};

export type JobMetaSection = {
  name: string;
};

export type JobMetaCompositeItem = {
  id: number;
  quantity: number;
};

export type JobMetaPlot = {
  name: string;
  group?: number;
  plot_total?: number;
  composite_items?: JobMetaCompositeItem[];
};

export type JobMetaPayload = {
  section?: JobMetaSection;
  plot: JobMetaPlot;
};

export type JobCreatePayload = {
  title: string;
  description: string;
  assigned_worker: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  forms?: number;

  job_status?: number;
  client?: number;
  project?: number;
  site?: number;
  job_meta?: JobMetaPayload;
};

/** Backend creates a job from a quotation (minimal body). */
export type JobCreateFromQuotationPayload = {
  quotation_id: number;
};

export type JobUpdatePayload = Partial<JobCreatePayload> & {
  job_status?: number;
};

export type Job = {
  id: number;
  created_by: JobUserRef | null;
  modified_by: JobUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  title: string;
  description: string;
  assigned_worker: number | JobAssignedWorkerRef;
  job_pin_status?: string | null;
  job_status: number | WorkflowColourStatus | null;
  start_date: string;
  end_date: string;
  completed_at: string | null;
  is_active: boolean;
  deleted_by: unknown;
  organization?: number;
  forms?: number | { id: number; name?: string };
  
  client?: number | { id: number; name?: string };
  project?: number | { id: number; name?: string };
  site?: number | { id: number; site_name?: string };
  job_meta?: JobMetaPayload | null;
};

export type JobPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type JobListResponse = {
  success: boolean;
  message: string;
  data: Job[];
  pagination: JobPagination;
};
