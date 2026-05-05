export type ProjectUserRef = {
  id: number;
  email: string;
  username: string;
};

export type ProjectUpsertPayload = {
  organization: number;
  name: string;
  client: number;
  description: string;

  start_date: string;

  end_date: string;
};

export type ProjectCreatePayload = ProjectUpsertPayload;
export type ProjectUpdatePayload = ProjectUpsertPayload;

export type Project = {
  id: number;
  created_by: ProjectUserRef | null;
  modified_by: ProjectUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  description: string;
  client: number;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  start_date: string;
  end_date: string;
  status: string;
  is_active: boolean;
  organization: number;
  deleted_by: unknown;
};

export type ProjectPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type ProjectListResponse = {
  success: boolean;
  message: string;
  data: Project[];
  pagination: ProjectPagination;
};
