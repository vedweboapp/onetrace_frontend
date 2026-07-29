import type { DispatchListItem, DispatchUserRef } from "@/features/dispatches/types/dispatch.types";

export function dispatchUserLabel(user: DispatchUserRef | number | null | undefined): string {
  if (user == null) return "—";
  if (typeof user === "number") return `#${user}`;
  return user.name?.trim() || user.username?.trim() || user.email?.trim() || `#${user.id}`;
}

export function dispatchWorkerLabel(worker: DispatchListItem["worker_name"] | any): string {
  if (worker == null) return "—";
  if (typeof worker === "number") return `#${worker}`;
  if (typeof worker === "object") {
    // Support multiple shapes returned by the API: { name }, { first_name, last_name }, { username }, { email }
    const name =
      worker.name?.trim() ||
      (worker.first_name || worker.last_name ? `${(worker.first_name || "").trim()} ${(worker.last_name || "").trim()}`.trim() : null) ||
      worker.username?.trim() ||
      worker.email?.trim();
    return (name && name.length > 0) ? name : `#${worker.id}`;
  }
  return "—";
}

export function normalizeDispatchStatus(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}
