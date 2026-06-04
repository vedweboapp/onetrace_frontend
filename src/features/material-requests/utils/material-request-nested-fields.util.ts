import type {
  MaterialRequestDetail,
  MaterialRequestItemRef,
  MaterialRequestJobRef,
  MaterialRequestListItem,
  MaterialRequestWorkerRef,
} from "@/features/material-requests/types/material-request.types";

export function nestedId(value: number | { id: number } | null | undefined): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "object" && typeof value.id === "number" && value.id > 0) return value.id;
  return undefined;
}

export function normalizeMaterialRequestStatus(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function materialRequestWorkerLabel(
  worker: MaterialRequestListItem["worker_name"],
  fallbackName?: string,
): string {
  if (worker && typeof worker === "object") {
    const name = worker.name?.trim();
    if (name) return name;
    const username = worker.username?.trim();
    if (username) return username;
    const email = worker.email?.trim();
    if (email) return email;
    const parts = [worker.first_name?.trim(), worker.last_name?.trim()].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
  }
  if (fallbackName?.trim()) return fallbackName.trim();
  const id = nestedId(worker);
  return id != null ? `#${id}` : "—";
}

export function materialRequestJobLabel(row: MaterialRequestListItem | MaterialRequestDetail): string {
  const direct = row.job_name?.trim();
  if (direct) return direct;
  const jobs = row.jobs ?? [];
  if (jobs.length === 0) return "—";
  const labels = jobs
    .map((job) => job.title?.trim() || (job.id > 0 ? `#${job.id}` : ""))
    .filter((label) => label.length > 0);
  if (labels.length === 0) return "—";
  if (labels.length === 1) return labels[0];
  return `${labels[0]} +${labels.length - 1}`;
}

export function materialRequestItemsCount(row: MaterialRequestListItem | MaterialRequestDetail): number {
  if (typeof row.items_count === "number" && Number.isFinite(row.items_count)) return row.items_count;
  return row.items?.length ?? 0;
}

export function materialRequestJobTitle(job: MaterialRequestJobRef): string {
  return job.title?.trim() || (job.id > 0 ? `#${job.id}` : "—");
}

export function materialRequestJobProjectName(job: MaterialRequestJobRef): string {
  return job.project?.name?.trim() || "—";
}

export function materialRequestItemProductName(row: MaterialRequestItemRef): string {
  const item = row.item;
  if (item && typeof item === "object") return item.name?.trim() || `#${item.id}`;
  if (typeof item === "number") return `#${item}`;
  return "—";
}

export function materialRequestItemGroupName(row: MaterialRequestItemRef): string {
  const group = row.group;
  if (group && typeof group === "object") return group.name?.trim() || "—";
  return "—";
}

export function materialRequestItemJobTitle(row: MaterialRequestItemRef): string {
  const job = row.job;
  if (job && typeof job === "object") {
    return job.title?.trim() || job.job_details?.trim() || (job.id > 0 ? `#${job.id}` : "—");
  }
  if (typeof job === "number") return `#${job}`;
  return "—";
}

export function materialRequestItemRequestedQty(row: MaterialRequestItemRef): number {
  if (typeof row.quantity === "number" && Number.isFinite(row.quantity)) return row.quantity;
  const item = row.item;
  if (item && typeof item === "object" && typeof item.quantity === "number" && Number.isFinite(item.quantity)) {
    return item.quantity;
  }
  return 0;
}

export function materialRequestItemDispatchedQty(row: MaterialRequestItemRef): number {
  if (typeof row.dispatched_quantity === "number" && Number.isFinite(row.dispatched_quantity)) {
    return row.dispatched_quantity;
  }
  const item = row.item;
  if (item && typeof item === "object" && typeof item.dispatched_quantity === "number") {
    return item.dispatched_quantity;
  }
  return 0;
}

export type MaterialRequestDispatchRow = {
  key: string;
  materialName: string;
  groupName: string;
  requested: number;
  dispatched: number;
  pending: number;
};

export function materialRequestDispatchRows(items: MaterialRequestItemRef[] | undefined): MaterialRequestDispatchRow[] {
  return (items ?? []).map((row, index) => {
    const requested = materialRequestItemRequestedQty(row);
    const dispatched = materialRequestItemDispatchedQty(row);
    return {
      key: String(row.id ?? index),
      materialName: materialRequestItemProductName(row),
      groupName: materialRequestItemGroupName(row),
      requested,
      dispatched,
      pending: Math.max(0, requested - dispatched),
    };
  });
}

export function materialRequestWorkerRef(
  worker: MaterialRequestListItem["worker_name"],
): MaterialRequestWorkerRef | null {
  if (worker && typeof worker === "object") return worker;
  return null;
}
