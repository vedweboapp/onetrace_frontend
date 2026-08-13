/** API `job_category` query/body values. */
export const JOB_CATEGORY = {
  service: "servicejob",
  project: "projectjob",
} as const;

export type JobCategoryApi = (typeof JOB_CATEGORY)[keyof typeof JOB_CATEGORY];

export function normalizeJobCategory(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

export function parseJobCategoryParam(raw: string | null | undefined): JobCategoryApi | undefined {
  const cat = normalizeJobCategory(raw);
  if (cat === JOB_CATEGORY.service || cat === "service") return JOB_CATEGORY.service;
  if (cat === JOB_CATEGORY.project || cat === "project") return JOB_CATEGORY.project;
  return undefined;
}

export function isServiceJobCategory(raw: string | null | undefined): boolean {
  return parseJobCategoryParam(raw) === JOB_CATEGORY.service;
}

export function isProjectJobCategory(raw: string | null | undefined): boolean {
  return parseJobCategoryParam(raw) === JOB_CATEGORY.project;
}

/** Infer service vs project job from API detail when the URL lacks `job_category`. */
export function resolveJobCategory(detail: {
  job_category?: string | null;
  project?: unknown;
}): JobCategoryApi {
  const fromApi = parseJobCategoryParam(detail.job_category);
  if (fromApi) return fromApi;
  const project = detail.project;
  if (project != null && project !== 0 && project !== "") return JOB_CATEGORY.project;
  return JOB_CATEGORY.service;
}
