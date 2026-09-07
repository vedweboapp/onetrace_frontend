import type { QuotationDetail, QuotationListItem } from "@/features/quotations/types/quotation.types";

const SERVICE_QUOTE_JOB_STORAGE_PREFIX = "onetrace:service-quote-job:";

function nestedId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

function storageKey(quotationId: number): string {
  return `${SERVICE_QUOTE_JOB_STORAGE_PREFIX}${quotationId}`;
}

/** Client-side flag: a job was already created from this service quote (survives detail reload). */
export function isServiceQuoteJobCreated(quotationId: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(storageKey(quotationId)) != null;
  } catch {
    return false;
  }
}

export function getServiceQuoteCreatedJobId(quotationId: number): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(quotationId));
    if (!raw || raw === "1") return null;
    const id = Number.parseInt(raw, 10);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function markServiceQuoteJobCreated(quotationId: number, jobId?: number): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(quotationId), jobId != null && jobId > 0 ? String(jobId) : "1");
  } catch {
    /* ignore quota / private mode */
  }
}

type QuotationJobLinkSource = Pick<
  QuotationListItem,
  | "job"
  | "job_id"
  | "has_job"
  | "is_job_created"
  | "service_job"
  | "linked_job"
  | "created_job"
  | "job_created"
>;

/** True when the API indicates a job was already created from this quotation. */
export function quotationHasLinkedJob(
  detail: QuotationJobLinkSource | null | undefined,
  quotationId?: number,
): boolean {
  if (detail) {
    if (detail.has_job === true || detail.is_job_created === true || detail.job_created === true) {
      return true;
    }
    if (
      nestedId(detail.job) != null ||
      nestedId(detail.job_id) != null ||
      nestedId(detail.service_job) != null ||
      nestedId(detail.linked_job) != null ||
      nestedId(detail.created_job) != null
    ) {
      return true;
    }
  }

  if (quotationId != null && isServiceQuoteJobCreated(quotationId)) {
    return true;
  }

  return false;
}

/** Linked job id when the API exposes one on the quotation. */
export function getQuotationLinkedJobId(
  detail: QuotationJobLinkSource | null | undefined,
): number | null {
  if (!detail) return null;
  return (
    nestedId(detail.job) ??
    nestedId(detail.job_id) ??
    nestedId(detail.service_job) ??
    nestedId(detail.linked_job)
  );
}
