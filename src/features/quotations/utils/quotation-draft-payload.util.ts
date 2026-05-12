import type {
  QuotationCreatePayload,
  QuotationQuoteSection,
  QuotationQuoteSectionLine,
  QuotationQuoteSectionPlot,
  QuotationSiteSnapshot,
} from "@/features/quotations/types/quotation.types";
import type { QuotationDraft, QuotationDraftLine } from "@/features/quotations/types/quotation-draft.types";
import { draftGrandTotal, draftLineTotal, draftSectionTotal } from "@/features/quotations/utils/quotation-draft-compute.util";
import type { Site } from "@/features/sites/types/site.types";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";

/** Synthetic plot `name` in `quote_sections` when the section has `section_lines` (no drawing plot). */
export const SECTION_DIRECT_PLOT_NAME = "Section items";

function mapQuoteLines(lines: QuotationDraftLine[]): QuotationQuoteSectionLine[] {
  return lines.map((line, li) => {
    const line_total = draftLineTotal(line);
    return {
      line_order: li,
      composite_item_id: line.composite_item_id,
      name: line.name,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_total,
    };
  });
}

function buildSiteSnapshot(site: Site, siteContact: number | null): QuotationSiteSnapshot {
  return {
    id: site.id,
    site_name: site.site_name,
    address_line_1: site.address_line_1 ?? null,
    address_line_2: site.address_line_2 ?? null,
    city: site.city ?? null,
    state: site.state ?? null,
    country: site.country ?? null,
    pincode: site.pincode ?? null,
    site_contact: siteContact,
  };
}

/**
 * Merges `site_snapshot` (address + optional `site_contact`) onto the quotation payload.
 * Safe to call for create/update whenever the selected site row is available.
 */
export function applyQuotationSiteSnapshot<T extends QuotationCreatePayload>(
  payload: T,
  site: Site | null | undefined,
  siteContact: number | null = null,
): T {
  if (!site || !Number.isFinite(site.id) || site.id <= 0) return payload;
  return { ...payload, site_snapshot: buildSiteSnapshot(site, siteContact) };
}

/**
 * Maps the client draft into `quote_sections`, `grand_total`, and ordered legacy `levels` ids.
 */
export function mergeQuotationDraftIntoPayload(base: QuotationCreatePayload, draft: QuotationDraft): QuotationCreatePayload {
  const includedSections = draft.sections.filter((s) => s.included);
  const levelsOrdered = includedSections.map((s) => s.level_id).filter((id): id is number => typeof id === "number" && id > 0);

  const quote_sections: QuotationQuoteSection[] = includedSections.map((section, si) => {
    const plotsOut: QuotationQuoteSectionPlot[] = [];
    let plotOrder = 0;
    const sectionLines = section.section_lines ?? [];
    if (sectionLines.length > 0) {
      const lines = mapQuoteLines(sectionLines);
      const plot_total = lines.reduce((a, x) => a + x.line_total, 0);
      plotsOut.push({
        plot_order: plotOrder++,
        plot_id: null,
        name: SECTION_DIRECT_PLOT_NAME,
        lines,
        plot_total,
      });
    }
    for (const plot of section.plots) {
      const lines = mapQuoteLines(plot.lines);
      const plot_total = lines.reduce((a, x) => a + x.line_total, 0);
      plotsOut.push({
        plot_order: plotOrder++,
        plot_id: plot.plot_id,
        name: plot.name,
        lines,
        plot_total,
      });
    }
    return {
      section_order: si,
      level_id: section.level_id,
      name: capitalizeFirstLetter(section.name ?? ""),
      plots: plotsOut,
      section_total: draftSectionTotal(section),
    };
  });

  const grand_total = draftGrandTotal(draft);

  return {
    ...base,
    select_all_levels: false,
    levels: levelsOrdered,
    quote_sections,
    grand_total,
  };
}
