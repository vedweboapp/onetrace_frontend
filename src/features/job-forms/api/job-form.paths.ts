export const JOB_FORM_PATHS = {
  submit: (jobId: number) => `jobs/${jobId}/submit-form/`,
  workerFormSubmissions: (jobId: number) => `jobs/${jobId}/worker-form-submissions/`,
  /** All jobs — same list as per-job endpoint without `{jobId}`. */
  workerFormSubmissionsAll: "jobs/worker-form-submissions/",
  submittedList: (jobId: number) => `jobs/${jobId}/submitted-forms/`,
  submittedDetail: (jobId: number, submissionId: number) =>
    `jobs/${jobId}/submitted-forms/${submissionId}/`,
  submittedUpdate: (jobId: number, submissionId: number) =>
    `jobs/${jobId}/submitted-forms/${submissionId}/update/`,
} as const;
