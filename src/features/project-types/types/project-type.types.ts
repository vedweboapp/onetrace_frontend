export type ProjectTypeUserRef = {
  id: number;
  email: string;
  username: string;
};

export type ProjectType = {
  id: number;
  created_by: ProjectTypeUserRef | null;
  modified_by: ProjectTypeUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  project_type: string;
  bg_colour: string;
  text_colour: string;
  is_active: boolean;
  deleted_by: unknown;
  organization?: number;
};

export type ProjectTypePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type ProjectTypeListResponse = {
  success: boolean;
  message: string;
  data: ProjectType[];
  pagination: ProjectTypePagination;
};

export type ProjectTypeCreatePayload = {
  project_type: string;
  bg_colour: string;
  text_colour: string;
};

export type ProjectTypeUpdatePayload = Partial<ProjectTypeCreatePayload> & {
  is_active?: boolean;
};
