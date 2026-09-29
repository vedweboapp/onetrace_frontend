import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";

function normalizeStatusName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Resolves the default "To do" pin status id from the catalog (new-pin default). */
export function resolveDefaultPinStatusId(statuses: WorkflowColourStatus[]): number | null {
  const match = statuses.find((row) => {
    const n = normalizeStatusName(row.status_name);
    return n === "to do" || n === "todo" || n === "pick to do";
  });
  return match?.id ?? null;
}

export function resolveDefaultPinStatus(statuses: WorkflowColourStatus[]): WorkflowColourStatus | null {
  const id = resolveDefaultPinStatusId(statuses);
  if (id != null) {
    return statuses.find((row) => row.id === id) ?? null;
  }
  return statuses[0] ?? null;
}
