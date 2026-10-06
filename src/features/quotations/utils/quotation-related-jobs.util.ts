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
    nestedId(row.quotation) ??
    nestedId(row.quotation_id) ??
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
 * Load jobs created from a quotation. Uses `quotation` / `quotation_id` list filters
 * when the API supports them, then falls back to the linked job id on the quote.
 */
export async function fetchJobsForQuotation(options: {
  quotationId: number;
  jobCategory?: string;
  projectId?: number | null;
  linkedJobId?: number | null;
}): Promise<Job[]> {
  const { quotationId, jobCategory, projectId, linkedJobId } = options;
  const byId = new Map<number, Job>();

  const tryList = async (filters: Parameters<typeof fetchJobsPage>[2]) => {
    const { items } = await fetchJobsPage(1, 100, filters, { silent: true });
    return items;
  };

  try {
    const items = await tryList({
      quotation: quotationId,
      quotation_id: quotationId,
      job_category: jobCategory,
      project: projectId ?? undefined,
    });
    const tagged = items.filter((job) => getJobQuotationId(job) === quotationId);
    if (tagged.length > 0) {
      mergeJobs(byId, tagged);
    } else {
      const anyQuotationField = items.some((job) => getJobQuotationId(job) != null);
      if (!anyQuotationField && items.length > 0 && items.length <= 20) {
        mergeJobs(byId, items);
      }
    }
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
