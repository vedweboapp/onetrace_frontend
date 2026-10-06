import type { QuotationQuoteSectionKind } from "@/features/quotations/types/quotation.types";

export function resolveQuotationSectionType(
  section: { kind?: QuotationQuoteSectionKind | null; section_type?: QuotationQuoteSectionKind | null },
  fallback: QuotationQuoteSectionKind = "primary",
): QuotationQuoteSectionKind {
  const raw = section.section_type ?? section.kind ?? fallback;
  if (raw === "optional") return "optional";
  if (raw === "project") return "project";
  return "primary";
}

export function labourLineSellPrice(costRate: number, markupPct: number): number {
  if (!Number.isFinite(costRate) || !Number.isFinite(markupPct)) return 0;
  return Math.round(costRate * (1 + markupPct / 100) * 100) / 100;
}

export function labourLineTotalCost(sellingPrice: number, timeHours: number): number {
  if (!Number.isFinite(sellingPrice) || !Number.isFinite(timeHours) || timeHours < 0) return 0;
  return Math.round(sellingPrice * timeHours * 100) / 100;
}
