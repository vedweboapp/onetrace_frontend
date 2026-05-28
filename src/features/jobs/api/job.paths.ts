export const JOB_PATHS = {
  list: "jobs/",
  createFromQuotation: "jobs/create-from-quotation/",
  detail: (id: number) => `jobs/${id}/`,
} as const;
