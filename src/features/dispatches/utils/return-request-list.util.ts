import type {
  DispatchReturnRequest,
  DispatchReturnRequestListFilters,
} from "@/features/dispatches/types/dispatch.types";
import { dispatchReturnWorkerLabel } from "@/features/dispatches/utils/dispatch-return.util";
import {
  dispatchDateInRange,
  resolveWorkerReturnDateRange,
} from "@/features/dispatches/utils/worker-return-date.util";

export function returnRequestLineCount(request: DispatchReturnRequest): number {
  return (request.lines ?? []).length;
}

export function returnRequestTotalQty(request: DispatchReturnRequest): number {
  return (request.lines ?? []).reduce((sum, line) => sum + line.quantity, 0);
}

export function returnRequestItemSummary(request: DispatchReturnRequest): string {
  const names = (request.lines ?? [])
    .map((line) => line.item_name?.trim() || `#${line.item_id}`)
    .filter((name) => name.length > 0);
  if (names.length === 0) return "—";
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}

export function returnRequestStatusLabel(
  t: (key: string) => string,
  status: DispatchReturnRequest["status"],
): string {
  if (status === "pending") return t("return.statusReturnRequest");
  if (status === "completed") return t("return.statusReturnedToStock");
  if (status === "rejected") return t("return.statusRejected");
  return status;
}

type MaterialRequestResolver = (dispatchId: number) => number | null;

export function filterReturnRequests(
  rows: DispatchReturnRequest[],
  filters: DispatchReturnRequestListFilters,
  resolveMaterialRequestId?: MaterialRequestResolver,
): DispatchReturnRequest[] {
  const search = filters.search?.trim().toLowerCase();
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  if (filters.date_preset && filters.date_preset !== "material_request") {
    const range = resolveWorkerReturnDateRange(
      filters.date_preset,
      filters.date_from,
      filters.date_to,
    );
    dateFrom = range.date_from;
    dateTo = range.date_to;
  }

  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;

    if (filters.worker_name != null) {
      const id = typeof row.worker_name === "number" ? row.worker_name : row.worker_name?.id;
      if (id !== filters.worker_name) return false;
    }

    if (
      filters.date_preset !== "material_request" &&
      dateTo &&
      !dispatchDateInRange(row.requested_at, dateFrom, dateTo)
    ) {
      return false;
    }

    if (filters.material_request_id != null && filters.material_request_id > 0) {
      const mrId = filters.material_request_id;
      const matches = (row.lines ?? []).some((line) => {
        const resolved = resolveMaterialRequestId?.(line.dispatch_id ?? 0);
        return resolved === mrId;
      });
      if (!matches) return false;
    }

    if (search) {
      const worker = dispatchReturnWorkerLabel(row.worker_name).toLowerCase();
      const hay = [
        row.request_number,
        worker,
        ...(row.lines ?? []).map((line) => line.item_name?.trim() ?? ""),
        ...(row.lines ?? []).map((line) => line.dispatch_order_number),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }

    return true;
  });
}

export function paginateReturnRequests<T>(
  rows: T[],
  page: number,
  pageSize: number,
): { items: T[]; total_records: number; total_pages: number; current_page: number; page_size: number } {
  const total_records = rows.length;
  const total_pages = Math.max(1, Math.ceil(total_records / pageSize));
  const current_page = Math.min(Math.max(1, page), total_pages);
  const start = (current_page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    total_records,
    total_pages,
    current_page,
    page_size: pageSize,
  };
}
