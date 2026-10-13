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

export type ModuleImportResult = {
  message?: string;
  total_records?: number;
  created_count?: number;
  updated_count?: number;
  merged_row_count?: number;
  skipped_count?: number;
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
