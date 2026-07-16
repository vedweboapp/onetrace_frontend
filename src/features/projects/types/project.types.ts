export type ProjectUserRef = {
  id: number;
  email: string;
  username: string;
};

export type ProjectUpsertPayload = {
  organization?: number;
  name: string;
  client: number;
  project_type: number;
  description: string;
  sites?: number[];
  form_ids?: number[];
  start_date: string;
  end_date: string;
  project_status?: number;
  manager_ids?: number[];
};

export type ProjectCreatePayload = ProjectUpsertPayload;
export type ProjectUpdatePayload = Partial<ProjectUpsertPayload>;
export type LocationToJobPayload = {
  project: number,
  // title: string,
  pin_ids: number[],
  site?: number,
  start_date?: string,
  assigned_worker?: number
  checklists: number[] | string[] | undefined
  job_status?: number
}
/** When the API embeds client on project detail/list rows. */
export type ProjectClientRef = {
  id: number;
  name?: string | null;
};

export type ProjectTypeRef = {
  id: number;
  project_type?: string | null;
  bg_color?: string | null;
  text_color?: string | null;
  /** Legacy API spelling */
  bg_colour?: string | null;
  text_colour?: string | null;
};

/** Site row embedded on project detail from the API. */
export type ProjectSiteRef = {
  id: number;
  site_name?: string | null;
  is_active?: boolean;
};

export type ProjectStatusRef = {
  id: number;
  name?: string | null;
  bg_color?: string | null;
  text_color?: string | null;
  organization?: number;
  is_active?: boolean;
};

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
  client: number | ProjectClientRef;
  project_type?: number | ProjectTypeRef | null;
  sites?: Array<number | ProjectSiteRef> | null;
  form_ids?: number[] | null;
  forms?: Array<{ id: number; name?: string | null } | number> | null;
  managers?: Array<{ id: number; username?: string; email?: string } | number> | null;
  manager_ids?: number[] | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  start_date: string;
  end_date: string;
  status: string;
  project_status?: number | ProjectStatusRef | null;
  is_active: boolean;
  organization: number;
  deleted_by: unknown;
};
export type Location = {
  [key: string]: any
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
