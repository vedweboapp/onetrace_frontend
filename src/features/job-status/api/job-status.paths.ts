export const JOB_STATUS_PATHS = {
  list: "job-status/",
  detail: (id: number) => `job-status/${id}/`,
} as const;
