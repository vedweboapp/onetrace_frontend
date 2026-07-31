export type QualityAssuranceUserRef = {
  id: number;
  name: string;
};

export type QualityAssuranceRecord = {
  status: "approved" | "rejected" | "pending" | string;
  remarks?: string | null;
  approved_at?: string | null;
  approved_by?: QualityAssuranceUserRef | null;
};

export function hasQualityAssuranceStatus(
  record: QualityAssuranceRecord | null | undefined,
): boolean {
  return typeof record?.status === "string" && record.status.trim().length > 0;
}

export function isQualityAssuranceApproved(
  record: QualityAssuranceRecord | null | undefined,
): boolean {
  return (record?.status ?? "").toLowerCase() === "approved";
}

export function isQualityAssuranceRejected(
  record: QualityAssuranceRecord | null | undefined,
): boolean {
  return (record?.status ?? "").toLowerCase() === "rejected";
}

/** True only when QA has a final decision (approved / rejected). Pending still allows Yes/No. */
export function isQualityAssuranceDecided(
  record: QualityAssuranceRecord | null | undefined,
): boolean {
  return isQualityAssuranceApproved(record) || isQualityAssuranceRejected(record);
}
