import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import type { QualityAssuranceRecord } from "./quality-assurance.types";

export type JobUserRef = {
  id: number;
  email: string;
  username: string;
};

export type JobAssignedWorkerRef = {
  id: number;
  name?: string;
  email?: string;
  username?: string;
  first_name?: string | null;
  last_name?: string | null;
};

export type JobClientRef = {
  id: number;
  name?: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type JobProjectRef = {
  id: number;
  name?: string;
};

export type JobSiteRef = {
  id: number;
  site_name?: string;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  what3words?: string | null;
  is_active?: boolean;
};

export type JobChecklistItem = {
  id: number;
  title: string | null;
  sequence: number;
  is_required: boolean;
  is_checked: boolean;
  checked_at: string | null;
  concentric_point?: boolean;
  file?: string | null;
  concentric_point_is_checked?: boolean;
};

/** Raw job detail checklist row (API may use `checklist_id`). */
export type JobChecklistApiRow = {
  id?: number;
  checklist_id?: number;
  title?: string | null;
  sequence?: number;
  is_required?: boolean;
  is_checked?: boolean;
  checked_at?: string | null;
  concentric_point?: boolean;
  file?: string | null;
  concentric_point_is_checked?: boolean;
};

/** Job detail checklists block: `{ is_marked, items: [...] }`. */
export type JobChecklistsBlock = {
  is_marked?: boolean;
  items?: JobChecklistApiRow[];
};

export type JobChecklistUpdateItem = {
  checklist_id: number;
  is_checked: boolean;
  is_marked: boolean;
  concentric_point: boolean;
};

export type JobFormRef = {
  /** Job form assignment id (`job_form_id` from job detail API). */
  id: number;
  project_form_id: number;
  name?: string | null;
  is_submitted?: boolean;
  /** Present when this job form has been submitted; use for detail API + status. */
  submitted_form_id?: number | null;
  /** Optional dynamic form identifier from the job detail API. */
  dynamic_form_id?: number | string | null;
};

/** Raw job detail `forms` entry (API may use `job_form_id` / `submission_id`). */
export type JobFormRefApiRow = {
  id?: number;
  job_form_id?: number;
  project_form_id?: number;
  project_form_name?: string | null;
  name?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  is_submitted?: boolean;
  submitted_form_id?: number | null;
  submission_id?: number | null;
  dynamic_form_id?: number | string | null;
};

export type JobQrCodeRef = {
  qr_code_id?: string;
  qr_image?: string | null;
};

export type JobMetaCompositeGroupRef = {
  id: number;
  name?: string;
};

export type JobMetaCompositeItem = {
  id?: number;
  name?: string;
  group?: JobMetaCompositeGroupRef | null;
  quantity: number;
  amount?: number;
  /** Legacy read paths (older API / drafts). */
  item?: number | { id: number; name?: string; selling_price?: number };
  selling_price?: number;
};

/** POST/GET `job_meta` shape. */
export type JobMetaPayload = {
  total?: number;
  composite_items?: JobMetaCompositeItem[];
};

/** Legacy nested shape (older API / drafts). */
export type JobMetaLegacyPayload = {
  section?: { name: string };
  plot?: {
    name: string;
    group?: number;
    plot_total?: number;
    composite_items?: JobMetaCompositeItem[];
  };
};

export type JobLevelPinSnapshot = {
  id: number;
};

export type JobLevelPlotSnapshot = {
  id: number;
  name: string;
  pins?: JobLevelPinSnapshot[];
};

export type JobLevelSnapshot = {
  id: number;
  name: string;
  drawing_file?: string;
  plots?: JobLevelPlotSnapshot[];
};

export type JobCreatePayload = {
  // title: string;
  description: string;
  assigned_worker: number;
  start_date: string;
  forms?: number[];
  job_status?: number;
  client?: number;
  project?: number;
  site?: number;
  job_category?: string;
  job_meta?: JobMetaPayload;
  checklists?: number[];
  pin_ids?: number[];
};

/** Backend creates a job from a quotation (minimal body). */
export type JobCreateFromQuotationPayload = {
  quotation_id: number;
};

export type JobUpdatePayload = Omit<Partial<JobCreatePayload>, "checklists"> & {
  job_status?: number;
  /** List/detail toggle; omitted on create payload. */
  is_active?: boolean;
  /** Schedule end (used by Scheduling / Create Schedule). */
  end_date?: string | null;
  pin_ids?: number[];
  pins?: Array<{ id: number; status: number | null }>;
  checklists?: number[] | JobChecklistUpdateItem[];
  /** Included when editing jobs created from project pins. */
  levels?: JobLevelSnapshot[];
};

export type Job = {
  id: number;
  created_by: JobUserRef | null;
  modified_by: JobUserRef | null;
  created_at: string;
  modified_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  title: string;
  job_serial_number: string | null;
  description: string | null;
  assigned_worker: number | JobAssignedWorkerRef;
  job_pin_status?: string | null;
  job_status: number | WorkflowColourStatus | null;
  start_date: string;
  end_date: string;
  completed_at: string | null;
  is_active: boolean;
  deleted_by: unknown;
  organization?: number;
  forms?: number | number[] | JobFormRef | JobFormRef[];
  checklists?: JobChecklistItem[] | JobChecklistApiRow[] | JobChecklistsBlock;
  client?: number | JobClientRef;
  project?: number | JobProjectRef;
  site?: number | JobSiteRef;
  qr_code?: JobQrCodeRef | null;
  job_category?: string | null;
  job_meta?: JobMetaPayload | JobMetaLegacyPayload | null;
  job_quality_assurance?: QualityAssuranceRecord | null;
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
