import { fetchJob, fetchJobsPage } from "@/features/jobs/api/job.api";
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
 * Load jobs created from a quotation via `GET /jobs/?quotation_id=…`.
 * Falls back to the linked job id on the quote when the list is empty.
 */
export async function fetchJobsForQuotation(options: {
  quotationId: number;
  jobCategory?: string;
  linkedJobId?: number | null;
}): Promise<Job[]> {
  const { quotationId, jobCategory, linkedJobId } = options;
  const byId = new Map<number, Job>();

  try {
    const { items } = await fetchJobsPage(
      1,
      100,
      {
        quotation_id: quotationId,
        job_category: jobCategory,
      },
      { silent: true },
    );
    // API already filters by quotation_id — keep all returned rows.
    // If a row exposes a quotation id and it differs, drop that row only.
    const matched = items.filter((job) => {
      const qid = getJobQuotationId(job);
      return qid == null || qid === quotationId;
    });
    mergeJobs(byId, matched);
  } catch {
    /* list filter may not be supported */
  }

  if (linkedJobId && !byId.has(linkedJobId)) {
    try {
      mergeJobs(byId, [await fetchJob(linkedJobId, { silent: true })]);
    } catch {
      /* ignore */
    }
  }

  return [...byId.values()];
}
