import type { MaterialRequestExtraDispatchItem } from "@/features/material-requests/types/material-request-dispatch.types";
import {
  aggregateMaterialRequestItems,
  materialRequestUniqueItemCount,
  type AggregatedMaterialRequestItem,
} from "@/features/material-requests/utils/material-request-item-aggregate.util";
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
    const parts = [worker.first_name?.trim(), worker.last_name?.trim()].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
    const name = worker.name?.trim();
    if (name) return name;
    const username = worker.username?.trim();
    if (username) return username;
    const email = worker.email?.trim();
    if (email) return email;
  }
  if (fallbackName?.trim()) return fallbackName.trim();
  const id = nestedId(worker);
  return id != null ? `#${id}` : "—";
}

export function materialRequestJobLabel(row: MaterialRequestListItem | MaterialRequestDetail): string {
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
  const unique = materialRequestUniqueItemCount(row.items);
  if (unique > 0) return unique;
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
  if (row.item_name?.trim()) return row.item_name.trim();
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
  if (typeof row.requested_quantity === "number" && Number.isFinite(row.requested_quantity)) {
    return row.requested_quantity;
  }
  if (typeof row.quantity === "number" && Number.isFinite(row.quantity)) return row.quantity;
  const item = row.item;
  if (item && typeof item === "object" && typeof item.quantity === "number" && Number.isFinite(item.quantity)) {
    return item.quantity;
  }
  return 0;
}

export function materialRequestItemStockQty(row: MaterialRequestItemRef): number | null {
  const item = row.item;
  if (item && typeof item === "object") {
    if (typeof item.stock_quantity === "number" && Number.isFinite(item.stock_quantity)) return item.stock_quantity;
    if (typeof item.available_stock === "number" && Number.isFinite(item.available_stock)) return item.available_stock;
  }
  return null;
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

export function materialRequestItemPendingQty(row: MaterialRequestItemRef): number {
  if (typeof row.pending_quantity === "number" && Number.isFinite(row.pending_quantity)) {
    return Math.max(0, row.pending_quantity);
  }
  return Math.max(0, materialRequestItemRequestedQty(row) - materialRequestItemDispatchedQty(row));
}

export function materialRequestItemRestockedQty(row: MaterialRequestItemRef): number {
  if (typeof row.restocked_quantity === "number" && Number.isFinite(row.restocked_quantity)) {
    return row.restocked_quantity;
  }
  if (typeof row.returned_quantity === "number" && Number.isFinite(row.returned_quantity)) {
    return row.returned_quantity;
  }
  return 0;
}

export function materialRequestItemDispatchedSurplus(row: MaterialRequestItemRef): number {
  return Math.max(0, materialRequestItemDispatchedQty(row) - materialRequestItemRequestedQty(row));
}

export type MaterialRequestDispatchedDisplay = {
  fulfilled: number;
  surplus: number;
};

export function materialRequestDispatchedDisplay(row: MaterialRequestItemRef): MaterialRequestDispatchedDisplay {
  const requested = materialRequestItemRequestedQty(row);
  const dispatched = materialRequestItemDispatchedQty(row);
  const fulfilled = dispatched <= 0 ? 0 : Math.min(dispatched, requested);
  const surplus = Math.max(0, dispatched - requested);
  return { fulfilled, surplus };
}

/** @deprecated Prefer materialRequestDispatchedDisplay for split fulfilled/surplus UI. */
export function formatMaterialRequestDispatchedLabel(row: MaterialRequestItemRef): string {
  const { fulfilled, surplus } = materialRequestDispatchedDisplay(row);
  if (fulfilled <= 0 && surplus <= 0) return "0";
  if (surplus <= 0) return fulfilled.toFixed(0);
  return `${fulfilled.toFixed(0)} +${surplus.toFixed(0)}`;
}

export type MaterialRequestDispatchRow = {
  key: string;
  itemId: number;
  materialName: string;
  groupName: string;
  requested: number;
  dispatched: number;
  pending: number;
  sources: AggregatedMaterialRequestItem["sources"];
};

export function materialRequestDispatchRows(items: MaterialRequestItemRef[] | undefined): MaterialRequestDispatchRow[] {
  return aggregateMaterialRequestItems(items).map((row) => ({
    key: row.key,
    itemId: row.itemId,
    materialName: row.materialName,
    groupName: row.groupName,
    requested: row.requested,
    dispatched: row.dispatched,
    pending: row.pending,
    sources: row.sources,
  }));
}

export function materialRequestExtraItemId(row: MaterialRequestExtraDispatchItem): number {
  if (typeof row.item === "number") return row.item;
  return row.item.id;
}

export function materialRequestExtraItemName(row: MaterialRequestExtraDispatchItem): string {
  if (typeof row.item === "object" && row.item.name?.trim()) return row.item.name.trim();
  if (row.item_name?.trim()) return row.item_name.trim();
  const id = materialRequestExtraItemId(row);
  return id > 0 ? `Item #${id}` : "—";
}

export function materialRequestWorkerRef(
  worker: MaterialRequestListItem["worker_name"],
): MaterialRequestWorkerRef | null {
  if (worker && typeof worker === "object") return worker;
  return null;
}
