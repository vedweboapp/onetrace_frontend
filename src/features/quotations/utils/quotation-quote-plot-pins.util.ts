import type { QuotationQuoteSectionPin, QuotationQuoteSectionPlot } from "@/features/quotations/types/quotation.types";

/** Legacy quote plot line shape (pre-pins API). */
type LegacyQuoteSectionLine = {
  line_order: number;
  composite_item_id: number | null;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

/**
 * Returns `plot.pins` from the API, or migrates legacy `plot.lines` into pin-shaped rows for display/seed.
 */
export function getQuotePlotPinsForDisplay(plot: QuotationQuoteSectionPlot): QuotationQuoteSectionPin[] {
  if (Array.isArray(plot.pins)) {
    return plot.pins;
  }
  const legacy = (plot as QuotationQuoteSectionPlot & { lines?: LegacyQuoteSectionLine[] }).lines;
  if (!Array.isArray(legacy) || legacy.length === 0) return [];
  return [...legacy]
    .sort((a, b) => a.line_order - b.line_order)
    .map((l, i) => {
      const order = Number.isFinite(l.line_order) ? l.line_order : i;
      const qty = l.quantity;
      const unit = l.unit_price;
      const total =
        typeof l.line_total === "number" && Number.isFinite(l.line_total) ? l.line_total : qty * unit;
      return {
        pins_order: order,
        pin_id: null,
        composite_item_id: l.composite_item_id,
        name: l.name,
        quantity: qty,
        selling_price: unit,
        pins_total: total,
      };
    });
}
