import type { QuotationDraft } from "@/features/quotations/types/quotation-draft.types";

export function draftLineTotal(line: { quantity: number; unit_price: number }): number {
  const q = line.quantity;
  const u = line.unit_price;
  if (!Number.isFinite(q) || !Number.isFinite(u)) return 0;
  return q * u;
}

export function draftPlotTotal(plot: { lines: Array<{ quantity: number; unit_price: number }> }): number {
  return plot.lines.reduce((acc, ln) => acc + draftLineTotal(ln), 0);
}

export function draftSectionTotal(section: {
  section_lines?: Array<{ quantity: number; unit_price: number }>;
  plots: Array<{ lines: Array<{ quantity: number; unit_price: number }> }>;
}): number {
  const direct = (section.section_lines ?? []).reduce((acc, ln) => acc + draftLineTotal(ln), 0);
  return direct + section.plots.reduce((acc, p) => acc + draftPlotTotal(p), 0);
}

export function draftGrandTotal(draft: QuotationDraft): number {
  return draft.sections.filter((s) => s.included).reduce((acc, s) => acc + draftSectionTotal(s), 0);
}
