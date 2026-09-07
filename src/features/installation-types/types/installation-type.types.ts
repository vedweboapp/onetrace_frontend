export type InstallationTypeUserRef = {
  id: number;
  email: string;
  username: string;
};

export type InstallationType = {
  id: number;
  created_by: InstallationTypeUserRef | null;
  modified_by: InstallationTypeUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  installation_type: string;
  bg_color: string;
  text_color: string;
  is_active: boolean;
  deleted_by: unknown;
  organization?: number;
};

export type InstallationTypePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type InstallationTypeListResponse = {
  success: boolean;
  message: string;
  data: InstallationType[];
  pagination: InstallationTypePagination;
};

export type InstallationTypeCreatePayload = {
  installation_type: string;
  bg_color: string;
  text_color: string;
};

export type InstallationTypeUpdatePayload = Partial<InstallationTypeCreatePayload> & {
  is_active?: boolean;
};
