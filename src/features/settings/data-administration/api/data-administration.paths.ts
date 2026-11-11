/** Backend uses `data-adminstration` for history/undo and `data-administration` for redo/downloads. */
const HISTORY_ROOT = "data-adminstration";
const ACTION_ROOT = "data-administration";

export const DATA_ADMINISTRATION_PATHS = {
  importHistory: `${HISTORY_ROOT}/import-history/`,
  exportHistory: `${HISTORY_ROOT}/export-history/`,
  undo: (logId: number | string) => `${HISTORY_ROOT}/${logId}/undo/`,
  redo: (logId: number | string) => `${ACTION_ROOT}/${logId}/redo/`,
  downloadOriginal: (logId: number | string) => `${ACTION_ROOT}/${logId}/download-original/`,
  downloadSkipped: (logId: number | string) => `${ACTION_ROOT}/${logId}/download-skipped/`,
} as const;
