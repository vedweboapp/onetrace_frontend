import type { JobMetaCompositeItem, JobMetaPayload } from "@/features/jobs/types/job.types";

export function parsePositiveQuantity(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function computeJobMetaPlotTotal(
  quantity: number,
  sellingPrice: number | string | null | undefined,
): number {
  const price = typeof sellingPrice === "number" && Number.isFinite(sellingPrice) ? sellingPrice : Number.parseFloat(String(sellingPrice ?? ""));
  if (!Number.isFinite(price) || price < 0) return 0;
  return quantity * price;
}

export function buildJobMetaPayload(input: {
  sectionName: string;
  plotName: string;
  plotGroup: string;
  compositeItemId: string;
  compositeQuantity: string;
  compositeSellingPrice?: number | string | null;
}): JobMetaPayload | undefined {
  const sectionName = input.sectionName.trim();
  const plotName = input.plotName.trim();
  const groupId = input.plotGroup.trim();
  const compositeId = input.compositeItemId.trim();
  const quantityRaw = input.compositeQuantity.trim();

  const hasSection = sectionName.length > 0;
  const hasPlot = plotName.length > 0;
  const hasGroup = groupId.length > 0 && /^\d+$/.test(groupId);
  const hasComposite = compositeId.length > 0 && /^\d+$/.test(compositeId);
  const quantity = parsePositiveQuantity(quantityRaw);

  if (!hasSection && !hasPlot && !hasGroup && !hasComposite) return undefined;

  const composite_items: JobMetaCompositeItem[] = [];
  if (hasComposite) {
    const id = Number.parseInt(compositeId, 10);
    if (quantity != null) {
      composite_items.push({ id, quantity });
    }
  }

  const plot_total =
    quantity != null && composite_items.length > 0
      ? computeJobMetaPlotTotal(quantity, input.compositeSellingPrice ?? null)
      : 0;

  const plot: JobMetaPayload["plot"] = {
    name: plotName,
    plot_total,
    ...(hasGroup ? { group: Number.parseInt(groupId, 10) } : {}),
    ...(composite_items.length > 0 ? { composite_items } : {}),
  };

  return {
    ...(hasSection ? { section: { name: sectionName } } : {}),
    plot,
  };
}
