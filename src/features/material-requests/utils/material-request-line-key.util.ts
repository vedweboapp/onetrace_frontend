import type { MaterialRequestItemRef } from "@/features/material-requests/types/material-request.types";
import { nestedId } from "@/features/material-requests/utils/material-request-nested-fields.util";

export function materialRequestLineKey(row: MaterialRequestItemRef, index: number): string {
  if (row.id != null) return String(row.id);
  const jobId = nestedId(row.job);
  const itemId = nestedId(row.item);
  if (jobId != null && itemId != null) return `job-${jobId}-item-${itemId}`;
  return `idx-${index}`;
}
