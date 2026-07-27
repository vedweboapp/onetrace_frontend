import type {
  MaterialRequestDetail,
  MaterialRequestItemRef,
  MaterialRequestItemSummary,
  MaterialRequestJobRef,
  MaterialRequestListItem,
  MaterialRequestWorkerRef,
} from "@/features/material-requests/types/material-request.types";
import { buildMaterialRequestItemSummaries } from "@/features/material-requests/utils/material-request-summary.util";
import { nestedId } from "@/features/material-requests/utils/material-request-nested-fields.util";

type RawMaterialRequestLine = {
  id?: number;
  item?: number | { id: number; name?: string | null } | null;
  item_name?: string | null;
  item_sku?: string | null;
  requested_quantity?: number | null;
  quantity?: number | null;
  dispatched_quantity?: number | null;
  pending_quantity?: number | null;
  returned_quantity?: number | null;
  restocked_quantity?: number | null;
  job?: number | { id: number; title?: string | null } | null;
  group?: { id: number; name?: string | null } | null;
};

type RawMaterialRequest = MaterialRequestListItem & {
  job_worker?: number | MaterialRequestWorkerRef | null;
  material_request_line?: RawMaterialRequestLine[] | null;
  items?: RawMaterialRequestLine[] | null;
  item_summaries?: MaterialRequestItemSummary[] | null;
  status?: string | null;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeLine(raw: RawMaterialRequestLine): MaterialRequestItemRef {
  const itemId = nestedId(raw.item);
  const requested =
    asFiniteNumber(raw.requested_quantity) ?? asFiniteNumber(raw.quantity) ?? 0;
  const dispatched = asFiniteNumber(raw.dispatched_quantity) ?? 0;
  const returned =
    asFiniteNumber(raw.returned_quantity) ?? asFiniteNumber(raw.restocked_quantity) ?? 0;
  const pending =
    asFiniteNumber(raw.pending_quantity) ?? Math.max(0, requested - dispatched);

  const itemRef =
    itemId != null
      ? typeof raw.item === "object" && raw.item
        ? {
            ...raw.item,
            name: raw.item.name?.trim() || raw.item_name?.trim() || raw.item.name,
          }
        : {
            id: itemId,
            name: raw.item_name?.trim() || null,
          }
      : raw.item ?? null;

  return {
    id: raw.id,
    job: raw.job ?? null,
    group: raw.group ?? null,
    item: itemRef,
    item_name: raw.item_name ?? null,
    item_sku: raw.item_sku ?? null,
    requested_quantity: requested,
    quantity: requested,
    dispatched_quantity: dispatched,
    pending_quantity: pending,
    returned_quantity: returned,
    restocked_quantity: returned,
  };
}

function deriveJobsFromLines(items: MaterialRequestItemRef[]): MaterialRequestJobRef[] {
  const byId = new Map<number, MaterialRequestJobRef>();
  for (const line of items) {
    const job = line.job;
    if (job == null) continue;
    if (typeof job === "number") {
      if (job > 0 && !byId.has(job)) byId.set(job, { id: job });
      continue;
    }
    if (typeof job === "object" && typeof job.id === "number" && job.id > 0 && !byId.has(job.id)) {
      byId.set(job.id, { id: job.id, title: job.title ?? null });
    }
  }
  return [...byId.values()];
}

/** Map backend list/detail payloads (`job_worker`, `material_request_line`) into FE shape. */
export function normalizeMaterialRequestRow(raw: RawMaterialRequest): MaterialRequestDetail {
  const worker = raw.worker_name ?? raw.job_worker ?? null;
  const lines = (raw.items ?? raw.material_request_line ?? []) as RawMaterialRequestLine[];
  const items = lines.map(normalizeLine);
  const jobs =
    Array.isArray(raw.jobs) && raw.jobs.length > 0 ? raw.jobs : deriveJobsFromLines(items);
  const item_summaries =
    Array.isArray(raw.item_summaries) && raw.item_summaries.length > 0
      ? raw.item_summaries
      : buildMaterialRequestItemSummaries(items);

  return {
    ...raw,
    worker_name: worker,
    items,
    jobs,
    status: typeof raw.status === "string" ? raw.status : raw.status == null ? "" : String(raw.status),
    item_summaries,
    items_count:
      typeof raw.items_count === "number" && Number.isFinite(raw.items_count)
        ? raw.items_count
        : items.length,
  };
}

export function normalizeMaterialRequestListItems(
  rows: RawMaterialRequest[] | null | undefined,
): MaterialRequestListItem[] {
  return (rows ?? []).map((row) => normalizeMaterialRequestRow(row));
}
