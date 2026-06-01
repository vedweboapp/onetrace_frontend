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
      group: plot.group,
      composite_items: plot.composite_items,
    };
  }
  const flat = meta as JobMetaPayload;
  return {
    total: flat.total,
    group: flat.group,
    composite_items: flat.composite_items,
  };
}

export function buildJobMetaPayload(input: {
  groupId: string;
  compositeItemId: string;
  compositeQuantity: string;
  compositeSellingPrice?: number | string | null;
}): JobMetaPayload | undefined {
  const groupRaw = input.groupId.trim();
  const compositeId = input.compositeItemId.trim();
  const quantityRaw = input.compositeQuantity.trim();

  const hasGroup = groupRaw.length > 0 && /^\d+$/.test(groupRaw);
  const hasComposite = compositeId.length > 0 && /^\d+$/.test(compositeId);
  const quantity = parsePositiveQuantity(quantityRaw);

  if (!hasGroup && !hasComposite) return undefined;

  const composite_items: JobMetaCompositeItem[] = [];
  if (hasComposite && quantity != null) {
    const id = Number.parseInt(compositeId, 10);
    composite_items.push({ id, quantity });
  }

  const unitPrice = input.compositeSellingPrice ?? null;
  const lineTotal =
    quantity != null && composite_items.length > 0
      ? computeJobMetaLineTotal(quantity, unitPrice)
      : 0;

  const payload: JobMetaPayload = {};
  if (hasGroup) payload.group = Number.parseInt(groupRaw, 10);
  if (composite_items.length > 0) payload.composite_items = composite_items;
  if (lineTotal > 0) payload.total = lineTotal;
  return payload;
}

/** @deprecated Use computeJobMetaLineTotal */
export const computeJobMetaPlotTotal = computeJobMetaLineTotal;
