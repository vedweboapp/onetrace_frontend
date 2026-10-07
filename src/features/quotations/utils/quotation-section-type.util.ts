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

/** Optional sections are sent on the quote but excluded from quotation grand total. */
export function isOptionalQuoteSection(section: {
  kind?: QuotationQuoteSectionKind | null;
  section_type?: QuotationQuoteSectionKind | null;
}): boolean {
  return resolveQuotationSectionType(section, "primary") === "optional";
}
