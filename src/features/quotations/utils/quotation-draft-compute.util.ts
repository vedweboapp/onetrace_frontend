import type { QuotationDraft } from "@/features/quotations/types/quotation-draft.types";

export function draftPinTotal(pin: { quantity: number; selling_price: number }): number {
  const q = pin.quantity;
  const u = pin.selling_price;
  if (!Number.isFinite(q) || !Number.isFinite(u) || q < 0 || u < 0) return 0;
  return q * u;
}

export function draftPlotTotal(plot: { pins: Array<{ quantity: number; selling_price: number }> }): number {
  return plot.pins.reduce((acc, ln) => acc + draftPinTotal(ln), 0);
}

export function draftSectionTotal(section: {
  section_pins?: Array<{ quantity: number; selling_price: number }>;
  plots: Array<{ pins: Array<{ quantity: number; selling_price: number }> }>;
}): number {
  const direct = (section.section_pins ?? []).reduce((acc, ln) => acc + draftPinTotal(ln), 0);
  return direct + section.plots.reduce((acc, p) => acc + draftPlotTotal(p), 0);
}

export function draftGrandTotal(draft: QuotationDraft): number {
  return draft.sections.filter((s) => s.included).reduce((acc, s) => acc + draftSectionTotal(s), 0);
}
