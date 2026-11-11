const ROOT = "data-administration";

export const DATA_ADMINISTRATION_PATHS = {
  importHistory: `${ROOT}/import-history/`,
  exportHistory: `${ROOT}/export-history/`,
  undo: (logId: number | string) => `${ROOT}/${logId}/undo/`,
  redo: (logId: number | string) => `${ROOT}/${logId}/redo/`,
  downloadOriginal: (logId: number | string) => `${ROOT}/${logId}/download-original/`,
  downloadSkipped: (logId: number | string) => `${ROOT}/${logId}/download-skipped/`,
} as const;
