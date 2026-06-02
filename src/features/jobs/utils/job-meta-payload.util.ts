import type {
  JobMetaCompositeItem,
  JobMetaLegacyPayload,
  JobMetaPayload,
} from "@/features/jobs/types/job.types";

export function parsePositiveQuantity(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function computeJobMetaLineTotal(
  quantity: number,
  sellingPrice: number | string | null | undefined,
): number {
  const price =
    typeof sellingPrice === "number" && Number.isFinite(sellingPrice)
      ? sellingPrice
      : Number.parseFloat(String(sellingPrice ?? ""));
  if (!Number.isFinite(price) || price < 0) return 0;
  return quantity * price;
}

/** Normalize legacy nested `job_meta` to flat API shape for display and edit. */
export function normalizeJobMeta(
  meta: JobMetaPayload | JobMetaLegacyPayload | null | undefined,
): JobMetaPayload | null {
  if (!meta) return null;
  if ("plot" in meta && meta.plot) {
    const plot = meta.plot;
    return {
      total: plot.plot_total,
      composite_items: plot.composite_items,
    };
  }
  const flat = meta as JobMetaPayload;
  return {
    total: flat.total,
    composite_items: flat.composite_items,
  };
}

export function buildJobMetaPayload(
  rows: Array<{ group: string; item: string; quantity: string; rate?: string }>,
): JobMetaPayload | undefined {
  const composite_items: JobMetaCompositeItem[] = [];
  let total = 0;

  for (const row of rows) {
    const itemRaw = row.item.trim();
    const qty = parsePositiveQuantity(row.quantity);
    if (!/^\d+$/.test(itemRaw) || qty == null) continue;
    const itemId = Number.parseInt(itemRaw, 10);
    const groupRaw = row.group.trim();
    const group = /^\d+$/.test(groupRaw) ? Number.parseInt(groupRaw, 10) : null;
    const rate = row.rate != null ? Number.parseFloat(String(row.rate).trim()) : Number.NaN;
    const amount = Number.isFinite(rate) && rate >= 0 ? Number((qty * rate).toFixed(2)) : undefined;
    composite_items.push({ item: itemId, group, quantity: qty, amount });
    if (Number.isFinite(rate) && rate >= 0) {
      total += computeJobMetaLineTotal(qty, rate);
    }
  }

  if (composite_items.length === 0) return undefined;
  return {
    composite_items,
    total: total > 0 ? total : undefined,
  };
}

/** @deprecated Use computeJobMetaLineTotal */
export const computeJobMetaPlotTotal = computeJobMetaLineTotal;
