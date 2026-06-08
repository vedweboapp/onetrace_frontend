import { JOB_FORM_USE_MOCK } from "./job-form.mock.config";

/** Same-origin URLs for job form submission endpoints when mock is enabled. */
export function resolveJobFormRequestUrl(path: string): string {
  const normalized = path.replace(/^\//, "");
  if (!JOB_FORM_USE_MOCK) return path;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1/${normalized}`;
  }
  return `/api/v1/${normalized}`;
}
