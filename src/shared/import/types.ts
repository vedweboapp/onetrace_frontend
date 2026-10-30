export type ImportFieldDef = {
  /** Backend module field key sent in mapping.module_field */
  key: string;
  label: string;
  required?: boolean;
};

export type ImportColumnMapping = {
  module_field: string;
  file_column: string;
};

export type ParsedImportFile = {
  file: File;
  columns: string[];
  /** First data row values aligned to `columns` (for sample preview). */
  sampleRow: string[];
  rowCount: number;
};

export type ModuleImportConfig = {
  /** API path segment, e.g. `clients` → `POST clients/import/` */
  apiSegment: string;
  /** Modal title entity name, e.g. "Clients" */
  moduleLabel: string;
  fields: ImportFieldDef[];
};

/** Immediate response from `POST {segment}/import/` (background queue). */
export type ModuleImportQueueResult = {
  task_id: string;
  status?: string;
  message?: string;
};

/**
 * Progress / final payload from `GET {segment}/import-status/{task_id}/`.
 * Legacy sync-import counters are optional for backwards compatibility.
 */
export type ModuleImportStatusResult = {
  state?: string;
  percent?: number;
  inserted_count?: number;
  skipped_count?: number;
  /** Human-readable status line from the API. */
  status?: string;
  message?: string;
  total_records?: number;
  created_count?: number;
  updated_count?: number;
  merged_row_count?: number;
  failed_count?: number;
  created_notes_count?: number;
  skipped_notes_count?: number;
  created_ids?: number[];
  updated_ids?: number[];
  skipped_records?: unknown[];
  failed_records?: unknown[];
  not_imported_count?: number;
  not_imported_records?: unknown[];
  is_permission?: boolean;
};

/** Final result shown in the wizard (status payload after SUCCESS / FAILURE). */
export type ModuleImportResult = ModuleImportStatusResult & {
  task_id?: string;
};

/** Query `export_format` for `GET {segment}/download-skipped/{taskId}/`. */
export type ImportSkippedExportFormat = "csv" | "xlsx" | "zip" | "xls";
