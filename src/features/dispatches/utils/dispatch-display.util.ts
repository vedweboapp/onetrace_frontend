import type { DispatchListItem } from "@/features/dispatches/types/dispatch.types";

export function dispatchWorkerLabel(worker: DispatchListItem["worker_name"]): string {
  if (worker && typeof worker === "object") {
    return worker.name?.trim() || worker.username?.trim() || worker.email?.trim() || `#${worker.id}`;
  }
  if (typeof worker === "number") return `#${worker}`;
  return "—";
}

export function normalizeDispatchStatus(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}
