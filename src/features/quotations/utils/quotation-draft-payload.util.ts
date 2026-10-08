import type {
  QuotationCreatePayload,
  QuotationQuoteSection,
  QuotationQuoteSectionLabour,
  QuotationQuoteSectionPin,
  QuotationQuoteSectionPlot,
} from "@/features/quotations/types/quotation.types";
import type {
  QuotationDraft,
  QuotationDraftLine,
  QuotationDraftServiceLine,
} from "@/features/quotations/types/quotation-draft.types";
import {
  draftGrandTotal,
  draftPinTotal,
  draftSectionTotal,
  draftServiceLineTotal,
} from "@/features/quotations/utils/quotation-draft-compute.util";
import { quotationDraftLineGroupPayload } from "@/features/quotations/utils/quotation-draft-line-group.util";
import { resolveQuotationSectionType } from "@/features/quotations/utils/quotation-section-type.util";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";

/** Synthetic plot `name` in `quote_sections` when the section has `section_pins` (no drawing plot). */
export const SECTION_DIRECT_PLOT_NAME = "Material Items";

/** Legacy name used before Material Items; still recognised when seeding. */
export const SECTION_DIRECT_PLOT_NAME_LEGACY = "Section items";

function mapDraftPinsToQuotePins(pins: QuotationDraftLine[]): QuotationQuoteSectionPin[] {
  return pins.map((pin, i) => {
    const pins_total = draftPinTotal(pin);
    const hasItem =
      pin.composite_item_id != null && Number.isFinite(pin.composite_item_id) && pin.composite_item_id > 0;
    return {
      pins_order: i,
      pin_id: pin.pin_id != null && Number.isFinite(pin.pin_id) && pin.pin_id > 0 ? pin.pin_id : null,
      composite_item_id: pin.composite_item_id,
      name: pin.name,
      quantity: pin.quantity,
      selling_price: pin.selling_price,
      pins_total,
      // Manual catalog items use composite_item_id but are not composite kits.
      is_composite: pin.is_composite === true && hasItem,
      ...quotationDraftLineGroupPayload(pin),
      source_pins: Array.isArray(pin.source_pins) ? pin.source_pins : [],
    };
  });
}

function mapDraftServicesToQuoteLabours(services: QuotationDraftServiceLine[]): QuotationQuoteSectionLabour[] {
  return services
    .filter((row) => row.item_id != null && row.item_id > 0)
    .map((row) => {
      const itemId = row.item_id as number;
      const hours = Number.isFinite(row.time_hours) && row.time_hours >= 0 ? row.time_hours : 1;
      return {
        item: itemId,
        // Legacy backends that still read labour_type as the catalog id.
        labour_type: itemId,
        time_hours: hours,
        cost_rate: row.cost_price,
        markup_percentage: row.markup_percentage,
        selling_price: row.selling_price,
        total_cost: draftServiceLineTotal(row),
        name: row.item_name?.trim() || null,
      };
    });
}

/**
 * Maps the client draft into `quote_sections`, `grand_total`, and ordered legacy `levels` ids.
 * Service sections keep description / notes / service lines; project sections stay plot/pin-only.
 */
export function mergeQuotationDraftIntoPayload(
  base: QuotationCreatePayload,
  draft: QuotationDraft,
  options?: { defaultSectionType?: "primary" | "optional" | "project" },
): QuotationCreatePayload {
  const includedSections = draft.sections.filter((s) => s.included);
  const levelsOrdered = includedSections.map((s) => s.level_id).filter((id): id is number => typeof id === "number" && id > 0);
  const fallbackType = options?.defaultSectionType ?? "primary";

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
        coordinates: null,
        plot_border: null,
        plot_bg: null,
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
        coordinates: Array.isArray(plot.coordinates) ? plot.coordinates : null,
        plot_border: typeof plot.plot_border === "string" ? plot.plot_border : null,
        plot_bg: typeof plot.plot_bg === "string" ? plot.plot_bg : null,
        pins,
        plot_total,
      });
    }
    const section_type = resolveQuotationSectionType(section, fallbackType);
    const isProjectSection = section_type === "project";
    const description = section.description?.trim() || null;
    const notes = section.notes?.trim() || null;

    const baseSection: QuotationQuoteSection = {
      section_order: si,
      level_id: section.level_id,
      name: sanitizeTitleInput(section.name ?? ""),
      ...(isProjectSection
        ? {}
        : {
            description,
            notes,
          }),
      section_type,
      kind: section_type,
      drawing_file: typeof section.drawing_file === "string" ? section.drawing_file : null,
      drawing_file_type: typeof section.drawing_file_type === "string" ? section.drawing_file_type : null,
      drawing_file_size: typeof section.drawing_file_size === "number" ? section.drawing_file_size : null,
      block: typeof section.block === "string" ? section.block : null,
      level: typeof section.level === "string" ? section.level : null,
      order: typeof section.order === "number" ? section.order : null,
      ...(isProjectSection ? {} : { labours: mapDraftServicesToQuoteLabours(section.services ?? []) }),
      plots: plotsOut,
      section_total: draftSectionTotal(section),
    };

    return baseSection;
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
