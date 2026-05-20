export type WorkflowColourStatusUserRef = {
  id: number;
  email: string;
  username: string;
};

export type WorkflowColourStatus = {
  id: number;
  created_by: WorkflowColourStatusUserRef | null;
  modified_by: WorkflowColourStatusUserRef | null;
  created_at: string;
  modified_at: string;
  status_name: string;
  bg_colour: string;
  text_colour: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  is_active?: boolean;
  deleted_by?: unknown;
  organization?: number;
};

export type WorkflowColourStatusPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type WorkflowColourStatusListResponse = {
  success: boolean;
  message: string;
  data: WorkflowColourStatus[];
  pagination: WorkflowColourStatusPagination;
};

export type WorkflowColourStatusCreatePayload = {
  status_name: string;
  bg_colour: string;
  text_colour: string;
};

export type WorkflowColourStatusUpdatePayload = Partial<WorkflowColourStatusCreatePayload>;
