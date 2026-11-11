export type DataAdministrationUserRef = {
  id?: number;
  email?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
};

export type DataAdministrationLog = {
  id: number;
  file_name?: string | null;
  filename?: string | null;
  original_filename?: string | null;
  module?: string | null;
  module_name?: string | null;
  status?: string | null;
  created_at?: string | null;
  imported_at?: string | null;
  exported_at?: string | null;
  modified_at?: string | null;
  created_by?: DataAdministrationUserRef | string | number | null;
  imported_by?: DataAdministrationUserRef | string | number | null;
  exported_by?: DataAdministrationUserRef | string | number | null;
  user?: DataAdministrationUserRef | string | number | null;
  added_count?: number | null;
  created_count?: number | null;
  updated_count?: number | null;
  skipped_count?: number | null;
  total_records?: number | null;
  can_undo?: boolean | null;
  can_redo?: boolean | null;
  undo_available?: boolean | null;
  redo_available?: boolean | null;
  message?: string | null;
};

export type DataAdministrationPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type DataAdministrationListResponse = {
  success?: boolean;
  message?: string;
  data?: DataAdministrationLog[];
  pagination?: DataAdministrationPagination;
  results?: DataAdministrationLog[];
  next?: string | null;
  previous?: string | null;
  count?: number;
};
