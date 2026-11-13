const ROOT = "data-administration";

export const DATA_ADMINISTRATION_PATHS = {
  importHistory: `${ROOT}/import-history/`,
  exportHistory: `${ROOT}/export-history/`,
  undo: (logId: number | string) => `${ROOT}/${logId}/undo/`,
  downloadSkipped: (logId: number | string) => `${ROOT}/${logId}/download-skipped/`,
  downloadOriginal: (logId: number | string) => `${ROOT}/${logId}/download-original/`,
} as const;
