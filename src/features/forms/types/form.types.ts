export type FormListItem = {
  id: number;
  name: string;
  project_type?: number | { id: number; project_type?: string | null } | null;
  is_active?: boolean;
  created_by?: { id: number; email?: string; username?: string } | null;
  modified_by?: { id: number; email?: string; username?: string } | null;
  created_at?: string;
  modified_at?: string | null;
  installation_type?: any;
  installation_type_id?: any;
  [key: string]: unknown;
};

export type FormsPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};
