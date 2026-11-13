export type DataAdministrationUserRef = {
  id?: number;
  email?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
};

export type DataAdministrationLogId = string | number;

/** Query `export_format` for import download-skipped / download-original. */
export type DataAdministrationExportFormat = "csv" | "xlsx";


export type DataAdministrationLog = {
  id: DataAdministrationLogId;
  file_name?: string | null;
  filename?: string | null;
  original_filename?: string | null;
  app_label?: string | null;
  model_name?: string | null;
  module?: string | null;
  module_name?: string | null;
  module_display_name?: string | null;
  status?: string | null;
  export_format?: string | null;
  import_format?: string | null;
  created_at?: string | null;
  imported_at?: string | null;
  exported_at?: string | null;
  modified_at?: string | null;
  created_by?: DataAdministrationUserRef | string | number | null;
  created_by_detail?: DataAdministrationUserRef | null;
  imported_by?: DataAdministrationUserRef | string | number | null;
  exported_by?: DataAdministrationUserRef | string | number | null;
  user?: DataAdministrationUserRef | string | number | null;
  ip_address?: string | null;
  user_agent?: string | null;
  device_type?: string | null;
  exported_records_count?: number | null;
  imported_records_count?: number | null;
  added_count?: number | null;
  created_count?: number | null;
  updated_count?: number | null;
  skipped_count?: number | null;
  total_records?: number | null;
  can_undo?: boolean | null;
  can_redo?: boolean | null;
  undo_available?: boolean | null;
  redo_available?: boolean | null;
  is_deleted?: boolean | null;
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
