import type { QuotationDetail, QuotationListItem } from "@/features/quotations/types/quotation.types";

function nestedId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

type QuotationJobLinkSource = Pick<
  QuotationListItem,
  "job" | "job_id" | "has_job" | "is_job_created" | "service_job" | "linked_job"
>;

/** True when the API indicates a job was already created from this quotation. */
export function quotationHasLinkedJob(
  detail: QuotationJobLinkSource | null | undefined,
): boolean {
  if (!detail) return false;
  if (detail.has_job === true || detail.is_job_created === true) return true;
  if (nestedId(detail.job) != null) return true;
  if (nestedId(detail.job_id) != null) return true;
  if (nestedId(detail.service_job) != null) return true;
  if (nestedId(detail.linked_job) != null) return true;
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
