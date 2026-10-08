import type { QuotationDraft } from "@/features/quotations/types/quotation-draft.types";
import { isOptionalQuoteSection } from "@/features/quotations/utils/quotation-section-type.util";

/** Money for quote payloads — 2 dp so float noise (e.g. 470.84000000000003) never hits the API. */
export function roundQuoteMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function draftPinTotal(pin: { quantity: number; selling_price: number }): number {
  const q = pin.quantity;
  const u = pin.selling_price;
  if (!Number.isFinite(q) || !Number.isFinite(u) || q < 0 || u < 0) return 0;
  return roundQuoteMoney(q * u);
}

export function draftPlotTotal(plot: { pins: Array<{ quantity: number; selling_price: number }> }): number {
  return roundQuoteMoney(plot.pins.reduce((acc, ln) => acc + draftPinTotal(ln), 0));
}

/** Service line total = unit selling price × time hours. */
export function draftServiceLineTotal(line: { selling_price: number; time_hours?: number }): number {
  const u = line.selling_price;
  const h = line.time_hours;
  if (!Number.isFinite(u) || u < 0) return 0;
  const hours = Number.isFinite(h) && (h as number) >= 0 ? (h as number) : 1;
  return roundQuoteMoney(u * hours);
}

export function draftSectionTotal(section: {
  services?: Array<{ selling_price: number; time_hours?: number }>;
  section_pins?: Array<{ quantity: number; selling_price: number }>;
  plots: Array<{ pins: Array<{ quantity: number; selling_price: number }> }>;
}): number {
  const services = (section.services ?? []).reduce((acc, ln) => acc + draftServiceLineTotal(ln), 0);
  const direct = (section.section_pins ?? []).reduce((acc, ln) => acc + draftPinTotal(ln), 0);
  const plots = section.plots.reduce((acc, p) => acc + draftPlotTotal(p), 0);
  return roundQuoteMoney(services + direct + plots);
}

/** Quote total: included primary/project sections only — optional sections are excluded. */
export function draftGrandTotal(draft: QuotationDraft): number {
  return roundQuoteMoney(
    draft.sections
      .filter((s) => s.included && !isOptionalQuoteSection(s))
      .reduce((acc, s) => acc + draftSectionTotal(s), 0),
  );
}

/** Sum section totals for API/PDF display, excluding optional sections. */
export function sumQuoteSectionsGrandTotal(
  sections: Array<{
    section_total?: number | null;
    kind?: Parameters<typeof isOptionalQuoteSection>[0]["kind"];
    section_type?: Parameters<typeof isOptionalQuoteSection>[0]["section_type"];
  }>,
): number {
  return roundQuoteMoney(
    sections.reduce((acc, s) => {
      if (isOptionalQuoteSection(s)) return acc;
      const n = typeof s.section_total === "number" && Number.isFinite(s.section_total) ? s.section_total : 0;
      return acc + n;
    }, 0),
  );
}
