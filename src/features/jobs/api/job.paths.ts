export const JOB_PATHS = {
  list: "jobs/",
  detail: (id: number) => `jobs/${id}/`,
} as const;
