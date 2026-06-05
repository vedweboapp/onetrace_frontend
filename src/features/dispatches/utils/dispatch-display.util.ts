import type { DispatchListItem, DispatchUserRef } from "@/features/dispatches/types/dispatch.types";

export function dispatchUserLabel(user: DispatchUserRef | number | null | undefined): string {
  if (user == null) return "—";
  if (typeof user === "number") return `#${user}`;
  return user.name?.trim() || user.username?.trim() || user.email?.trim() || `#${user.id}`;
}

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
