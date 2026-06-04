import type {
  JobMetaCompositeGroupRef,
  JobMetaCompositeItem,
  JobMetaLegacyPayload,
  JobMetaPayload,
} from "@/features/jobs/types/job.types";

export type JobMetaFormRow = {
  group: string;
  group_name?: string;
  item: string;
  item_name?: string;
  quantity: string;
  rate?: string;
};

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

/** Resolve composite line item id from API response (id or legacy `item`). */
export function resolveJobMetaCompositeItemId(
  row: Pick<JobMetaCompositeItem, "id" | "item">,
): number | null {
  if (typeof row.id === "number" && row.id > 0) return row.id;
  const item = row.item;
  if (typeof item === "number" && item > 0) return item;
  if (item && typeof item === "object" && typeof item.id === "number" && item.id > 0) return item.id;
  return null;
}

function resolveGroupRef(groupRaw: string, groupName?: string): JobMetaCompositeGroupRef | null {
  const trimmed = groupRaw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const id = Number.parseInt(trimmed, 10);
  const name = groupName?.trim();
  return name ? { id, name } : { id };
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

export function buildJobMetaPayload(rows: JobMetaFormRow[]): JobMetaPayload | undefined {
  const composite_items: JobMetaCompositeItem[] = [];
  let total = 0;

  for (const row of rows) {
    const itemRaw = row.item.trim();
    const qty = parsePositiveQuantity(row.quantity);
    if (!/^\d+$/.test(itemRaw) || qty == null) continue;

    const id = Number.parseInt(itemRaw, 10);
    const rate = row.rate != null ? Number.parseFloat(String(row.rate).trim()) : Number.NaN;
    const amount =
      Number.isFinite(rate) && rate >= 0
        ? Number((qty * rate).toFixed(2))
        : undefined;

    const name = row.item_name?.trim() || undefined;
    const group = resolveGroupRef(row.group, row.group_name);

    const line: JobMetaCompositeItem = {
      id,
      quantity: qty,
    };
    if (name) line.name = name;
    if (group) line.group = group;
    if (amount != null) line.amount = amount;

    composite_items.push(line);

    if (amount != null) {
      total += amount;
    } else if (Number.isFinite(rate) && rate >= 0) {
      total += computeJobMetaLineTotal(qty, rate);
    }
  }

  if (composite_items.length === 0) return undefined;
  return {
    composite_items,
    total: Number(total.toFixed(2)),
  };
}

/** @deprecated Use computeJobMetaLineTotal */
export const computeJobMetaPlotTotal = computeJobMetaLineTotal;
