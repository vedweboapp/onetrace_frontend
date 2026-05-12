import type { ProjectLevelForQuotation, QuotationPlotPin } from "@/features/quotations/types/quotation.types";

export type AggregatedCompositeLine = {
  key: string;
  displayName: string;
  totalQty: number;
  unitPrice: number;
  lineTotal: number;
  /** First pin’s composite item id in this aggregate (for quote draft lines). */
  compositeItemId: number | null;
};

export function parseMoneyValue(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function formatMoneyDisplay(amount: number, locale: string): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat(locale === "es" ? "es" : "en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function pinDisplayName(pin: QuotationPlotPin): string {
  const detail = pin.item_detail;
  const fromDetail = typeof detail?.name === "string" ? detail.name.trim() : "";
  if (fromDetail) return fromDetail;
  const c1 = typeof pin.composite_item_name === "string" ? pin.composite_item_name.trim() : "";
  if (c1) return c1;
  const c2 = typeof pin.composite_name === "string" ? pin.composite_name.trim() : "";
  if (c2) return c2;
  const n = typeof pin.name === "string" ? pin.name.trim() : "";
  if (n) return n;
  if (detail?.id != null) return `#${detail.id}`;
  return `Pin ${pin.id}`;
}

function pinUnitPrice(pin: QuotationPlotPin): number {
  const detail = pin.item_detail;
  const fromDetail = parseMoneyValue(detail?.selling_price ?? detail?.cost_price);
  if (fromDetail > 0) return fromDetail;
  return parseMoneyValue(pin.selling_price ?? pin.price ?? pin.amount);
}

function pinQty(pin: QuotationPlotPin): number {
  const q = pin.quantity;
  if (typeof q === "number" && Number.isFinite(q) && q > 0) return q;
  return 1;
}

/** One row per composite name: summed quantities and line totals. */
export function aggregateCompositeLinesForPlot(plot: { pins?: QuotationPlotPin[] }): AggregatedCompositeLine[] {
  const pins = Array.isArray(plot.pins) ? plot.pins : [];
  const map = new Map<string, AggregatedCompositeLine>();
  for (const pin of pins) {
    const displayName = pinDisplayName(pin);
    const key = displayName.toLowerCase();
    const unit = pinUnitPrice(pin);
    const qty = pinQty(pin);
    const line = unit * qty;
    const itemIdRaw = pin.item_detail?.id;
    const compositeItemId =
      typeof itemIdRaw === "number" && Number.isFinite(itemIdRaw) && itemIdRaw > 0 ? itemIdRaw : null;
    const prev = map.get(key);
    if (prev) {
      prev.totalQty += qty;
      prev.lineTotal += line;
      prev.unitPrice = prev.totalQty > 0 ? prev.lineTotal / prev.totalQty : prev.unitPrice;
      if (prev.compositeItemId == null && compositeItemId != null) prev.compositeItemId = compositeItemId;
    } else {
      map.set(key, {
        key,
        displayName,
        totalQty: qty,
        unitPrice: unit,
        lineTotal: line,
        compositeItemId,
      });
    }
  }
  return Array.from(map.values());
}

export function plotCompositeTotal(plot: { pins?: QuotationPlotPin[] }): number {
  return aggregateCompositeLinesForPlot(plot).reduce((a, r) => a + r.lineTotal, 0);
}

export function levelCompositeTotal(level: ProjectLevelForQuotation): number {
  const plots = Array.isArray(level.plots) ? level.plots : [];
  return plots.reduce((acc, p) => acc + plotCompositeTotal(p), 0);
}

export function setLevelMembershipOrdered(
  sortedRows: ProjectLevelForQuotation[],
  currentIds: number[],
  levelId: number,
  include: boolean,
): number[] {
  const set = new Set(currentIds);
  if (include) set.add(levelId);
  else set.delete(levelId);
  return sortedRows.map((r) => r.id).filter((id) => set.has(id));
}

export function isLevelIncluded(selectAllLevels: boolean, levelIds: number[], levelId: number): boolean {
  return selectAllLevels || levelIds.includes(levelId);
}
