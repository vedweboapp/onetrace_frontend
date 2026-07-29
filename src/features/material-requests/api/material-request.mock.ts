import {
  mockBackendFetchItemLabels,
  mockBackendFetchJob,
  type MockMaterialRequestListFilters,
} from "./material-request.mock-backend.util";
import type { MaterialRequestDispatchPayload } from "@/features/material-requests/types/material-request-dispatch.types";
import type { MaterialRequestExtraDispatchItem } from "@/features/material-requests/types/material-request-dispatch.types";
import type {
  MaterialRequestCreatePayload,
  MaterialRequestDetail,
  MaterialRequestItemRef,
  MaterialRequestJobRef,
  MaterialRequestListItem,
  MaterialRequestPagination,
  MaterialRequestUpdatePayload,
} from "@/features/material-requests/types/material-request.types";
import {
  materialRequestExtraItemId,
  materialRequestItemDispatchedQty,
  materialRequestItemRequestedQty,
  materialRequestItemStockQty,
  materialRequestJobLabel,
  nestedId,
} from "@/features/material-requests/utils/material-request-nested-fields.util";
import {
  loadDispatchUserLabelById,
  normalizeDispatchWorkerRef,
  resolveMockDispatchedBy,
} from "@/features/dispatches/utils/dispatch-enrich.util";
import { materialRequestLineKey } from "@/features/material-requests/utils/material-request-line-key.util";
import { buildMaterialRequestItemSummaries } from "@/features/material-requests/utils/material-request-summary.util";
import {
  allocateMaterialRequestDispatchQuantity,
} from "@/features/material-requests/utils/material-request-item-aggregate.util";
import {
  normalizeJobMeta,
  resolveJobMetaCompositeItemId,
} from "@/features/jobs/utils/job-meta-payload.util";
import {
  createDispatchFromMaterialRequestMock,
  type CreateDispatchLineInput,
} from "@/features/dispatches/api/dispatch.mock";
import type { MaterialRequestRestockPayload } from "@/features/material-requests/types/material-request.types";
import {
  allocateMaterialRequestMockId,
  getMaterialRequestMockEntity,
  getMaterialRequestMockRecord,
  listMaterialRequestMockEntities,
  saveMaterialRequestMockRecord,
  upsertMaterialRequestMockEntity,
  type MaterialRequestMockRecord,
} from "./material-request.mock-store";

function recomputeStatus(detail: MaterialRequestDetail, record: MaterialRequestMockRecord): string {
  const items = detail.items ?? [];
  let anyDispatched = (record.extraItems?.length ?? 0) > 0;
  let anyPending = false;

  for (const [index, row] of items.entries()) {
    const key = materialRequestLineKey(row, index);
    const requested = materialRequestItemRequestedQty(row);
    const dispatched = record.lineDispatched[key] ?? materialRequestItemDispatchedQty(row);
    if (dispatched > 0) anyDispatched = true;
    if (requested - dispatched > 0.0001) anyPending = true;
  }

  if (!anyDispatched) {
    if (typeof detail.status === "object" && detail.status) {
      return detail.status.name || detail.status.status_name || "pending";
    }
    return (typeof detail.status === "string" ? detail.status : null) || "pending";
  }
  if (!anyPending) return "dispatched";
  return "partially_dispatched";
}

function enrichMaterialRequestItem(
  row: MaterialRequestItemRef,
  index: number,
  record: MaterialRequestMockRecord,
): MaterialRequestItemRef {
  const key = materialRequestLineKey(row, index);
  const requested = materialRequestItemRequestedQty(row);
  const dispatched = record.lineDispatched[key] ?? materialRequestItemDispatchedQty(row);
  const pending = Math.max(0, requested - dispatched);
  const restocked = record.lineRestocked[key] ?? 0;
  const stockQty = materialRequestItemStockQty(row);
  const item =
    row.item && typeof row.item === "object"
      ? {
          ...row.item,
          stock_quantity: stockQty ?? row.item.stock_quantity ?? row.item.available_stock ?? null,
        }
      : row.item;

  return {
    ...row,
    item,
    requested_quantity: requested,
    quantity: requested,
    dispatched_quantity: dispatched,
    pending_quantity: pending,
    restocked_quantity: restocked,
  };
}

export function applyMaterialRequestMock(detail: MaterialRequestDetail): MaterialRequestDetail {
  const record = getMaterialRequestMockRecord(detail.id);
  const items = (detail.items ?? []).map((row, index) => enrichMaterialRequestItem(row, index, record));

  const status = record.statusOverride ?? recomputeStatus({ ...detail, items }, record);

  const enriched = {
    ...detail,
    status,
    items,
    items_count: items.length,
    job_name: materialRequestJobLabel({ ...detail, items }),
    extra_dispatch_items: record.extraItems,
    dispatch_ids: record.dispatchIds,
    restocked_quantity: record.lineRestocked,
    modified_at: detail.modified_at ?? new Date().toISOString(),
  };

  return {
    ...enriched,
    item_summaries: buildMaterialRequestItemSummaries(items),
  };
}

export async function fetchMaterialRequestLogsMock(id: number) {
  const record = getMaterialRequestMockRecord(id);
  return record.logs;
}

export async function restockMaterialRequestMock(
  id: number,
  payload: MaterialRequestRestockPayload,
  authHeader?: string | null,
): Promise<MaterialRequestDetail> {
  void authHeader;
  const detail = await fetchMaterialRequestMock(id);
  if (!detail) throw new Error(`Mock material request ${id} not found`);

  const record = getMaterialRequestMockRecord(id);
  const items = detail.items ?? [];
  let restockedUnits = 0;
  const now = new Date().toISOString();

  for (const line of payload.lines) {
    const qty = Math.max(0, line.quantity);
    if (qty <= 0) continue;
    const rowIndex = items.findIndex((row, index) => materialRequestLineKey(row, index) === line.line_key);
    if (rowIndex < 0) continue;
    const row = items[rowIndex];
    const key = materialRequestLineKey(row, rowIndex);
    const dispatched = record.lineDispatched[key] ?? 0;
    const alreadyRestocked = record.lineRestocked[key] ?? 0;
    const maxReturn = Math.max(0, dispatched - alreadyRestocked);
    const applied = Math.min(qty, maxReturn);
    if (applied <= 0) continue;

    record.lineRestocked[key] = alreadyRestocked + applied;
    restockedUnits += applied;

    const itemId = nestedId(row.item);
    if (itemId != null) {
      record.inventoryCredits[String(itemId)] = (record.inventoryCredits[String(itemId)] ?? 0) + applied;
    }
  }

  if (restockedUnits > 0) {
    record.logs = [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: "Items restocked",
        description: `Returned ${restockedUnits} unused unit(s) to inventory.`,
        occurred_at: now,
        tag: "restock",
      },
      ...record.logs,
    ];
  }

  saveMaterialRequestMockRecord(id, record);
  return applyMaterialRequestMock(detail);
}

function toListItem(detail: MaterialRequestDetail): MaterialRequestListItem {
  const applied = applyMaterialRequestMock(detail);
  return {
    id: applied.id,
    request_number: applied.request_number,
    worker_name: applied.worker_name,
    requested_date: applied.requested_date,
    status: applied.status,
    jobs: applied.jobs,
    items: applied.items,
    job_name: applied.job_name,
    items_count: applied.items_count,
    notes: applied.notes,
    created_at: applied.created_at,
  };
}

function paginate<T>(rows: T[], page: number, pageSize: number): { slice: T[]; pagination: MaterialRequestPagination } {
  const total_records = rows.length;
  const total_pages = Math.max(1, Math.ceil(total_records / pageSize) || 1);
  const current_page = Math.min(Math.max(1, page), total_pages);
  const start = (current_page - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  return {
    slice,
    pagination: {
      total_records,
      total_pages,
      current_page,
      page_size: pageSize,
      next: current_page < total_pages ? String(current_page + 1) : null,
      previous: current_page > 1 ? String(current_page - 1) : null,
    },
  };
}

function matchesFilters(detail: MaterialRequestDetail, filters?: MockMaterialRequestListFilters): boolean {
  if (!filters) return true;
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    const hay = [
      detail.request_number,
      detail.job_name,
      detail.notes,
      String(nestedId(detail.worker_name) ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.status?.trim() && detail.status !== filters.status.trim()) return false;
  if (filters.requested_date?.trim() && detail.requested_date.slice(0, 10) !== filters.requested_date.trim()) {
    return false;
  }
  if (filters.worker_name != null && String(filters.worker_name).trim()) {
    const workerId = nestedId(detail.worker_name);
    if (workerId == null || String(workerId) !== String(filters.worker_name).trim()) return false;
  }
  return true;
}

async function loadItemLabels(authHeader?: string | null): Promise<Record<number, string>> {
  try {
    return await mockBackendFetchItemLabels(authHeader);
  } catch {
    return {};
  }
}

async function enrichExtraDispatchItems(
  items: MaterialRequestExtraDispatchItem[],
  authHeader?: string | null,
): Promise<MaterialRequestExtraDispatchItem[]> {
  const labels = await loadItemLabels(authHeader);
  return items.map((row) => {
    const itemId = materialRequestExtraItemId(row);
    const name =
      row.item_name?.trim() ||
      (typeof row.item === "object" ? row.item.name?.trim() : null) ||
      labels[itemId] ||
      `Item #${itemId}`;
    return {
      ...row,
      item: { id: itemId, name },
      item_name: name,
    };
  });
}

async function enrichMaterialRequestDetail(
  detail: MaterialRequestDetail,
  authHeader?: string | null,
): Promise<MaterialRequestDetail> {
  const userLabels = await loadDispatchUserLabelById();
  const worker = normalizeDispatchWorkerRef(detail.worker_name, userLabels);
  const extra_dispatch_items = await enrichExtraDispatchItems(detail.extra_dispatch_items ?? [], authHeader);
  return {
    ...detail,
    worker_name: worker ?? detail.worker_name,
    extra_dispatch_items,
  };
}

async function buildJobsFromPayload(
  jobIds: number[],
  authHeader?: string | null,
): Promise<MaterialRequestJobRef[]> {
  const jobs: MaterialRequestJobRef[] = [];
  for (const id of jobIds) {
    try {
      const job = await mockBackendFetchJob(id, authHeader);
      if (!job) {
        jobs.push({ id, title: `Job #${id}` });
        continue;
      }
      jobs.push({
        id: job.id,
        title: job.title?.trim() || `Job #${id}`,
        project:
          job.project && typeof job.project === "object"
            ? { id: job.project.id, name: job.project.name ?? null }
            : null,
      });
    } catch {
      jobs.push({ id, title: `Job #${id}` });
    }
  }
  return jobs;
}

async function buildItemsFromJobs(
  jobIds: number[],
  itemLabels: Record<number, string>,
  authHeader?: string | null,
): Promise<MaterialRequestItemRef[]> {
  const items: MaterialRequestItemRef[] = [];
  let lineId = 1;

  for (const jobId of jobIds) {
    let jobTitle = `Job #${jobId}`;
    let meta = null;
    try {
      const job = await mockBackendFetchJob(jobId, authHeader);
      if (job) {
        jobTitle = job.title?.trim() || jobTitle;
        meta = normalizeJobMeta(job.job_meta as Parameters<typeof normalizeJobMeta>[0]);
      }
    } catch {
      /* use defaults */
    }

    for (const row of meta?.composite_items ?? []) {
      const itemId = resolveJobMetaCompositeItemId(row);
      if (itemId == null) continue;
      const qty =
        row.quantity != null && Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1;
      const itemName =
        itemLabels[itemId] ??
        row.name?.trim() ??
        (row.item && typeof row.item === "object" ? row.item.name?.trim() : null) ??
        `Item #${itemId}`;

      items.push({
        id: lineId++,
        job: { id: jobId, title: jobTitle },
        item: { id: itemId, name: itemName, quantity: qty, dispatched_quantity: 0 },
        quantity: qty,
        requested_quantity: qty,
        dispatched_quantity: 0,
        pending_quantity: qty,
      });
    }
  }

  return items;
}

async function buildItemsFromPayload(
  payloadItems: MaterialRequestCreatePayload["items"] | undefined,
  itemLabels: Record<number, string>,
  authHeader?: string | null,
): Promise<MaterialRequestItemRef[]> {
  if (!payloadItems?.length) return [];
  const jobTitleById = new Map<number, string>();
  const uniqueJobIds = [...new Set(payloadItems.map((row) => row.job))];
  for (const jobId of uniqueJobIds) {
    try {
      const job = await mockBackendFetchJob(jobId, authHeader);
      jobTitleById.set(jobId, job?.title?.trim() || `Job #${jobId}`);
    } catch {
      jobTitleById.set(jobId, `Job #${jobId}`);
    }
  }

  return payloadItems.map((row, index) => {
    const itemName = itemLabels[row.item] ?? `Item #${row.item}`;
    const jobTitle = jobTitleById.get(row.job) ?? `Job #${row.job}`;
    return {
      id: index + 1,
      job: { id: row.job, title: jobTitle },
      item: {
        id: row.item,
        name: itemName,
        quantity: row.quantity ?? 1,
        dispatched_quantity: 0,
      },
      quantity: row.quantity ?? 1,
      dispatched_quantity: 0,
    };
  });
}

function jobsChanged(payloadJobs: number[] | undefined, existing: MaterialRequestDetail | undefined): boolean {
  if (!payloadJobs) return false;
  const nextIds = [...payloadJobs].sort((a, b) => a - b).join(",");
  const prevIds = (existing?.jobs ?? []).map((j) => j.id).sort((a, b) => a - b).join(",");
  return nextIds !== prevIds;
}

async function buildDetailFromPayload(
  payload: MaterialRequestCreatePayload,
  id: number,
  existing?: MaterialRequestDetail,
  authHeader?: string | null,
): Promise<MaterialRequestDetail> {
  const itemLabels = await loadItemLabels(authHeader);
  const jobIds = payload.jobs?.map((j) => j.job) ?? existing?.jobs?.map((j) => j.id) ?? [];
  const jobs = await buildJobsFromPayload(jobIds, authHeader);
  const payloadJobIds = payload.jobs?.map((j) => j.job);
  let items: MaterialRequestItemRef[];
  if (payload.items && payload.items.length > 0) {
    items = await buildItemsFromPayload(payload.items, itemLabels, authHeader);
  } else if (existing?.items?.length && !jobsChanged(payloadJobIds, existing)) {
    items = existing.items;
  } else {
    items = await buildItemsFromJobs(jobIds, itemLabels, authHeader);
  }
  const now = new Date().toISOString();

  return {
    id,
    request_number: existing?.request_number ?? `MR-${String(id).padStart(5, "0")}`,
    worker_name: payload.worker_name ?? nestedId(existing?.worker_name) ?? 0,
    requested_date: payload.requested_date ?? existing?.requested_date ?? now.slice(0, 10),
    status: payload.status ?? existing?.status ?? "draft",
    jobs,
    items,
    items_count: items.length,
    job_name: jobs[0]?.title ?? null,
    notes: payload.notes ?? existing?.notes ?? null,
    created_at: existing?.created_at ?? now,
    modified_at: now,
    timeline: [],
    created_by: existing?.created_by ?? null,
    modified_by: existing?.modified_by ?? null,
  };
}

export function resolveMaterialRequestDetailWithMock(detail: MaterialRequestDetail): MaterialRequestDetail {
  upsertMaterialRequestMockEntity(detail);
  return applyMaterialRequestMock(detail);
}

export function resolveMaterialRequestDetailFallback(id: number): MaterialRequestDetail | null {
  const entity = getMaterialRequestMockEntity(id);
  if (!entity) return null;
  return applyMaterialRequestMock(entity);
}

export async function fetchMaterialRequestMock(
  id: number,
  authHeader?: string | null,
): Promise<MaterialRequestDetail | null> {
  const entity = getMaterialRequestMockEntity(id);
  if (!entity) return null;
  const applied = applyMaterialRequestMock(entity);
  return enrichMaterialRequestDetail(applied, authHeader);
}

export async function fetchMaterialRequestsPageMock(
  page = 1,
  pageSize = 20,
  filters?: MockMaterialRequestListFilters,
): Promise<{ items: MaterialRequestListItem[]; pagination: MaterialRequestPagination }> {
  const all = listMaterialRequestMockEntities()
    .filter((row) => matchesFilters(row, filters))
    .map((row) => toListItem(row));
  const { slice, pagination } = paginate(all, page, pageSize);
  return { items: slice, pagination };
}

export async function createMaterialRequestMock(
  body: MaterialRequestCreatePayload,
  authHeader?: string | null,
): Promise<MaterialRequestDetail> {
  const id = allocateMaterialRequestMockId();
  const detail = await buildDetailFromPayload(body, id, undefined, authHeader);
  upsertMaterialRequestMockEntity(detail);
  return applyMaterialRequestMock(detail);
}

export async function updateMaterialRequestMock(
  id: number,
  body: MaterialRequestUpdatePayload,
  authHeader?: string | null,
): Promise<MaterialRequestDetail> {
  const existing = getMaterialRequestMockEntity(id);
  if (!existing) {
    throw new Error(`Mock material request ${id} not found`);
  }

  let statusValue: string | undefined;
  if (body.status) {
    statusValue = body.status;
  } else if (existing.status) {
    if (typeof existing.status === "object") {
      statusValue = existing.status.name || existing.status.status_name || undefined;
    } else if (typeof existing.status === "string") {
      statusValue = existing.status;
    }
  }

  const mergedPayload: MaterialRequestCreatePayload = {
    worker_name: body.worker_name ?? nestedId(existing.worker_name) ?? 0,
    requested_date: body.requested_date ?? existing.requested_date,
    status: statusValue,
    jobs: body.jobs ?? existing.jobs?.map((j) => ({ job: j.id })) ?? [],
    items: body.items,
    notes: body.notes ?? existing.notes ?? undefined,
  };

  const detail = await buildDetailFromPayload(mergedPayload, id, existing, authHeader);
  upsertMaterialRequestMockEntity(detail);
  return applyMaterialRequestMock(detail);
}

export async function dispatchMaterialRequestMock(
  id: number,
  payload: MaterialRequestDispatchPayload,
  authHeader?: string | null,
): Promise<MaterialRequestDetail> {
  const detail = await fetchMaterialRequestMock(id);
  if (!detail) {
    throw new Error(`Mock material request ${id} not found`);
  }
  if (payload.material_request !== id) {
    throw new Error(`Invalid material_request reference: expected ${id}`);
  }
  if (!payload.dispatch_date?.trim()) {
    throw new Error("Invalid dispatch_date");
  }

  const itemLabels = await loadItemLabels(authHeader);
  const record = getMaterialRequestMockRecord(detail.id);
  const items = detail.items ?? [];
  let dispatchedUnits = 0;

  const expandedLines: Array<{ line_key: string; quantity: number }> = [];

  for (const line of payload.lines ?? []) {
    const qty = Math.max(0, line.quantity);
    if (qty <= 0) continue;

    if (line.material_request_line != null && line.material_request_line > 0) {
      const rowIndex = items.findIndex((row) => row.id === line.material_request_line);
      if (rowIndex >= 0) {
        expandedLines.push({ line_key: materialRequestLineKey(items[rowIndex], rowIndex), quantity: qty });
        continue;
      }
    }

    if (line.item != null && line.item > 0) {
      const sources = items
        .map((row, index) => {
          const itemId = nestedId(row.item);
          if (itemId !== line.item) return null;
          const key = materialRequestLineKey(row, index);
          const requested = materialRequestItemRequestedQty(row);
          const dispatched = record.lineDispatched[key] ?? materialRequestItemDispatchedQty(row);
          const pending = Math.max(0, requested - dispatched);
          return { lineKey: key, pending, requested, alreadyDispatched: dispatched };
        })
        .filter((row): row is NonNullable<typeof row> => row != null);

      expandedLines.push(...allocateMaterialRequestDispatchQuantity(sources, qty));
      continue;
    }

    if (line.item_id != null && line.item_id > 0) {
      const sources = items
        .map((row, index) => {
          const itemId = nestedId(row.item);
          if (itemId !== line.item_id) return null;
          const key = materialRequestLineKey(row, index);
          const requested = materialRequestItemRequestedQty(row);
          const dispatched = record.lineDispatched[key] ?? materialRequestItemDispatchedQty(row);
          const pending = Math.max(0, requested - dispatched);
          return { lineKey: key, pending, requested, alreadyDispatched: dispatched };
        })
        .filter((row): row is NonNullable<typeof row> => row != null);

      expandedLines.push(...allocateMaterialRequestDispatchQuantity(sources, qty));
      continue;
    }

    if (line.line_key?.trim()) {
      expandedLines.push({ line_key: line.line_key.trim(), quantity: qty });
      continue;
    }
  }

  for (const line of expandedLines) {
    record.lineDispatched[line.line_key] = (record.lineDispatched[line.line_key] ?? 0) + line.quantity;
    dispatchedUnits += line.quantity;
  }

  const now = new Date().toISOString();
  for (const extra of payload.extra_items ?? []) {
    const qty = Math.max(0, extra.quantity);
    if (qty <= 0 || extra.item <= 0) continue;
    const itemName = itemLabels[extra.item] ?? `Item #${extra.item}`;
    const row: MaterialRequestExtraDispatchItem = {
      id: `extra-${Date.now()}-${extra.item}-${Math.random().toString(36).slice(2, 7)}`,
      item: { id: extra.item, name: itemName },
      item_name: itemName,
      quantity: qty,
      dispatched_at: now,
    };
    record.extraItems = [...record.extraItems, row];
    dispatchedUnits += qty;
  }

  if (dispatchedUnits > 0) {
    const dispatchLines: CreateDispatchLineInput[] = [];

    for (const line of expandedLines) {
      const qty = Math.max(0, line.quantity);
      if (qty <= 0) continue;
      const rowIndex = items.findIndex((row, index) => materialRequestLineKey(row, index) === line.line_key);
      const row = rowIndex >= 0 ? items[rowIndex] : null;
      const itemId = row ? nestedId(row.item) ?? 0 : 0;
      if (itemId <= 0) continue;
      const itemName =
        row && row.item && typeof row.item === "object"
          ? row.item.name?.trim() || `Item #${itemId}`
          : itemLabels[itemId] ?? `Item #${itemId}`;
      const jobRef =
        row?.job && typeof row.job === "object"
          ? { id: row.job.id, title: row.job.title ?? null }
          : null;

      dispatchLines.push({
        lineKey: line.line_key,
        materialRequestLineId: row?.id ?? null,
        job: jobRef,
        itemId,
        itemName,
        stockQuantity: row ? materialRequestItemStockQty(row) : null,
        workerName: detail.worker_name,
        requestedQuantity: row ? materialRequestItemRequestedQty(row) : 0,
        dispatchedQuantity: qty,
        isExtra: false,
      });
    }

    for (const extra of payload.extra_items ?? []) {
      const qty = Math.max(0, extra.quantity);
      if (qty <= 0 || extra.item <= 0) continue;
      dispatchLines.push({
        lineKey: `extra-${extra.item}-${Date.now()}`,
        materialRequestLineId: null,
        job: null,
        itemId: extra.item,
        itemName: itemLabels[extra.item] ?? `Item #${extra.item}`,
        stockQuantity: null,
        workerName: detail.worker_name,
        requestedQuantity: 0,
        dispatchedQuantity: qty,
        isExtra: true,
      });
    }

    const userLabels = await loadDispatchUserLabelById();
    const workerRef = normalizeDispatchWorkerRef(detail.worker_name, userLabels);
    const dispatchedBy = resolveMockDispatchedBy(authHeader);

    const dispatch = createDispatchFromMaterialRequestMock({
      materialRequestId: id,
      materialRequestNumber: detail.request_number,
      jobName: detail.job_name,
      workerName: workerRef ?? detail.worker_name,
      dispatchedBy,
      lines: dispatchLines,
    });

    record.dispatchIds = [dispatch.id, ...record.dispatchIds];
    const extraCount = (payload.extra_items ?? []).filter((e) => e.quantity > 0).length;
    record.logs = [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: "Materials dispatched",
        description:
          extraCount > 0
            ? `Dispatch ${dispatch.dispatch_order_number}: ${dispatchedUnits} units including ${extraCount} extra item(s).`
            : `Dispatch ${dispatch.dispatch_order_number}: ${dispatchedUnits} units.`,
        occurred_at: now,
        tag: "dispatch",
        dispatch_id: dispatch.id,
      },
      ...record.logs,
    ];
  }

  const mergedItems = items.map((row, index) => {
    const key = materialRequestLineKey(row, index);
    return { ...row, dispatched_quantity: record.lineDispatched[key] ?? 0 };
  });

  const nextBase: MaterialRequestDetail = {
    ...detail,
    items: mergedItems,
    items_count: mergedItems.length,
    modified_at: now,
  };

  record.statusOverride = recomputeStatus(nextBase, record);
  saveMaterialRequestMockRecord(id, record);
  upsertMaterialRequestMockEntity(nextBase);

  return enrichMaterialRequestDetail(applyMaterialRequestMock(nextBase), authHeader);
}
