import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";

function normalizeStatusName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Resolves the "To do" job status id from the catalog (create-job default). */
export function resolveDefaultJobStatusId(statuses: WorkflowColourStatus[]): number | null {
  const match = statuses.find((row) => {
    const n = normalizeStatusName(row.status_name);
    return n === "to do" || n === "todo";
  });
  return match?.id ?? null;
}
