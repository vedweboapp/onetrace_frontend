import type { RejectionReason } from "@/features/rejection-reasons/types/rejection-reason.types";

export function formatRejectionReasonLabel(row: Pick<RejectionReason, "id" | "name">): string {
  const name = row.name?.trim();
  return name || `Rejection reason #${row.id}`;
}
