import { fetchJob, fetchJobsPage } from "@/features/jobs/api/job.api";
import { JOB_CATEGORY } from "@/features/jobs/constants/job-category";
import type { Job } from "@/features/jobs/types/job.types";

function nestedId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (value && typeof value === "object" && "id" in value) {
    return nestedId((value as { id: unknown }).id);
  }
  return null;
}

export function getJobQuotationId(job: Job): number | null {
  const row = job as Job & Record<string, unknown>;
  return (
    nestedId(row.quotations) ??
    nestedId(row.quotation_id) ??
    nestedId(row.quotation) ??
    nestedId(row.quote) ??
    nestedId(row.quote_id)
  );
}

function mergeJobs(target: Map<number, Job>, jobs: Job[]) {
  for (const job of jobs) {
    if (job && typeof job.id === "number" && job.id > 0) target.set(job.id, job);
  }
}

/**
 * Load jobs for a quotation via `GET /jobs/?quotations=<id>`.
 * Service quotes expect a single linked job; project quotes may return several.
 */
export async function fetchJobsForQuotation(options: {
  quotationId: number;
  jobCategory?: string;
  linkedJobId?: number | null;
}): Promise<Job[]> {
  const { quotationId, jobCategory, linkedJobId } = options;
  const byId = new Map<number, Job>();
  const isService = jobCategory === JOB_CATEGORY.service;

  async function loadByQuote(extra?: { job_category?: string }) {
    const { items } = await fetchJobsPage(
      1,
      isService ? 20 : 100,
      {
        quotations: quotationId,
        ...extra,
      },
      { silent: true },
    );
    const matched = items.filter((job) => {
      const qid = getJobQuotationId(job);
      return qid == null || qid === quotationId;
    });
    mergeJobs(byId, matched);
  }

  try {
    await loadByQuote(jobCategory ? { job_category: jobCategory } : undefined);
  } catch {
    /* list filter may not be supported */
  }

  // Project quotes: if category filter returned nothing, retry with quote only.
  if (!isService && byId.size === 0) {
    try {
      await loadByQuote();
    } catch {
      /* ignore */
    }
  }

  if (linkedJobId && !byId.has(linkedJobId)) {
    try {
      mergeJobs(byId, [await fetchJob(linkedJobId, { silent: true })]);
    } catch {
      /* ignore */
    }
  }

  const jobs = [...byId.values()];
  if (isService) {
    if (linkedJobId && byId.has(linkedJobId)) return [byId.get(linkedJobId)!];
    return jobs[0] ? [jobs[0]] : [];
  }
  return jobs;
}
