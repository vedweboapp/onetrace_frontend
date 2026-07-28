// Keep the original row shape but augment with normalized `worker` and `total_qty` so
// callers can still access `lines` and other fields.
export function normalizeDispatchForList(raw: any): any {
  const totalQty = Number.isFinite(Number(raw.total_qty))
    ? Number(raw.total_qty)
    : Array.isArray(raw.lines)
    ? raw.lines.length
    : 0;

  const worker = raw.worker ?? raw.worker_name ?? null;

  return {
    ...raw,
    worker_name: worker,
    total_qty: totalQty,
  };
}

export function normalizeDispatchList(rows: any[]): any[] {
  return (rows ?? []).map(normalizeDispatchForList);
}
