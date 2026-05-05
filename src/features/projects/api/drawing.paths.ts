export const DRAWING_PATHS = {
  list: (projectId: number) => `project/${projectId}/level/`,
  detail: (projectId: number, drawingId: number) => `project/${projectId}/level/${drawingId}/`,
} as const;
