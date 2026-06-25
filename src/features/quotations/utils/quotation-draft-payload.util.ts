import type {
  QuotationCreatePayload,
  QuotationQuoteSection,
  QuotationQuoteSectionPin,
  QuotationQuoteSectionPlot,
} from "@/features/quotations/types/quotation.types";
import type { QuotationDraft, QuotationDraftLine } from "@/features/quotations/types/quotation-draft.types";
import { draftGrandTotal, draftPinTotal, draftSectionTotal } from "@/features/quotations/utils/quotation-draft-compute.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";

/** Synthetic plot `name` in `quote_sections` when the section has `section_pins` (no drawing plot). */
export const SECTION_DIRECT_PLOT_NAME = "Section items";

function mapDraftPinsToQuotePins(pins: QuotationDraftLine[]): QuotationQuoteSectionPin[] {
  return pins.map((pin, i) => {
    const pins_total = draftPinTotal(pin);
    return {
      pins_order: i,
      pin_id: pin.pin_id != null && Number.isFinite(pin.pin_id) && pin.pin_id > 0 ? pin.pin_id : null,
      composite_item_id: pin.composite_item_id,
      name: pin.name,
      quantity: pin.quantity,
      selling_price: pin.selling_price,
      pins_total,
    };
  });
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
    const sectionPins = section.section_pins ?? [];
    if (sectionPins.length > 0) {
      const pins = mapDraftPinsToQuotePins(sectionPins);
      const plot_total = pins.reduce((a, x) => a + x.pins_total, 0);
      plotsOut.push({
        plot_order: plotOrder++,
        plot_id: null,
        name: SECTION_DIRECT_PLOT_NAME,
        pins,
        plot_total,
      });
    }
    for (const plot of section.plots) {
      const pins = mapDraftPinsToQuotePins(plot.pins);
      const plot_total = pins.reduce((a, x) => a + x.pins_total, 0);
      plotsOut.push({
        plot_order: plotOrder++,
        plot_id: plot.plot_id,
        name: plot.name,
        pins,
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
