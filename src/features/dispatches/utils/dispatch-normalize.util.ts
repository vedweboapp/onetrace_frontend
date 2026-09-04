function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Number of line items on a dispatch (not total units). */
export function dispatchItemsCount(row: {
  items_count?: number | string | null;
  line_count?: number | string | null;
  lines?: unknown[] | null;
}): number {
  const lines = Array.isArray(row.lines) ? row.lines : [];
  if (lines.length > 0) return lines.length;
  return (
    asFiniteNumber(row.items_count) ??
    asFiniteNumber(row.line_count) ??
    0
  );
}

/** Sum dispatched units across lines — not the number of line items. */
export function dispatchTotalQty(row: {
  total_qty?: number | string | null;
  lines?: Array<{ quantity?: number | string | null; dispatched_quantity?: number | string | null }> | null;
}): number {
  const lines = Array.isArray(row.lines) ? row.lines : [];
  if (lines.length > 0) {
    return lines.reduce((sum, line) => {
      const qty = asFiniteNumber(line.quantity) ?? asFiniteNumber(line.dispatched_quantity) ?? 0;
      return sum + qty;
    }, 0);
  }
  return asFiniteNumber(row.total_qty) ?? 0;
}

// Keep the original row shape but augment with normalized `worker` and `total_qty` so
// callers can still access `lines` and other fields.
export function normalizeDispatchForList(raw: any): any {
  const worker = raw.worker ?? raw.worker_name ?? null;
  const itemsCount = dispatchItemsCount(raw);

  return {
    ...raw,
    worker_name: worker,
    total_qty: dispatchTotalQty(raw),
    items_count: itemsCount,
  };
}

export function normalizeDispatchList(rows: any[]): any[] {
  return (rows ?? []).map(normalizeDispatchForList);
}
