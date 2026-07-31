export const JOB_PATHS = {
  list: "jobs/",
  massUpdate: "jobs/mass-update/",
  createFromQuotation: "jobs/create-from-quotation/",
  detail: (id: number) => `jobs/${id}/`,
  qualityAssurance: (id: number) => `jobs/${id}/quality-assurance/`,
} as const;
