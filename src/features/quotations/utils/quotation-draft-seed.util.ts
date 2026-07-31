import type { ProjectLevelForQuotation, QuotationQuoteSection, QuotationQuoteSectionPin, QuotationQuoteSectionPlot } from "@/features/quotations/types/quotation.types";
import type { QuotationDraft, QuotationDraftLine, QuotationDraftPlot, QuotationDraftSection } from "@/features/quotations/types/quotation-draft.types";
import { aggregateCompositeLinesForPlot } from "@/features/quotations/utils/quotation-level-pricing.util";
import { newQuotationDraftId } from "@/features/quotations/utils/quotation-draft-id.util";
import { SECTION_DIRECT_PLOT_NAME } from "@/features/quotations/utils/quotation-draft-payload.util";
import { getQuotePlotPinsForDisplay } from "@/features/quotations/utils/quotation-quote-plot-pins.util";

function pinsFromProjectPlot(plot: NonNullable<ProjectLevelForQuotation["plots"]>[number]): QuotationDraftLine[] {
  const aggregated = aggregateCompositeLinesForPlot(plot);
  return aggregated.map((a) => ({
    id: newQuotationDraftId("line"),
    pin_id: null,
    composite_item_id: a.compositeItemId,
    name: a.displayName,
    quantity: a.totalQty,
    selling_price: a.unitPrice,
    pin_count: a.pinCount,
    source_pins: a.sourcePins,
  }));
}

/**
 * Seeds a draft from project levels rows (plots + pins). Sections and plots preserve API order within each level.
 */
export function seedDraftFromSortedLevels(sortedLevels: ProjectLevelForQuotation[]): QuotationDraft {
  const sections: QuotationDraftSection[] = [];

  for (const lv of sortedLevels) {
    const plotsSrc = Array.isArray(lv.plots) ? lv.plots : [];
    const plots: QuotationDraftPlot[] = plotsSrc.map((p) => ({
      id: newQuotationDraftId("plot"),
      plot_id: typeof p.id === "number" && p.id > 0 ? p.id : null,
      name: typeof p.name === "string" && p.name.trim() ? p.name.trim() : `Plot ${p.id}`,
      coordinates: Array.isArray(p.coordinates) ? p.coordinates : null,
      plot_border: typeof p.plot_border === "string" ? p.plot_border : null,
      plot_bg: typeof p.plot_bg === "string" ? p.plot_bg : null,
      pins: pinsFromProjectPlot(p),
    }));

    sections.push({
      id: newQuotationDraftId("sec"),
      level_id: typeof lv.id === "number" && lv.id > 0 ? lv.id : null,
      name: typeof lv.name === "string" && lv.name.trim() ? lv.name.trim() : `Section ${lv.id}`,
      drawing_file: typeof lv.drawing_file === "string" ? lv.drawing_file : null,
      drawing_file_type: typeof lv.drawing_file_type === "string" ? lv.drawing_file_type : null,
      drawing_file_size: typeof lv.drawing_file_size === "number" ? lv.drawing_file_size : null,
      block: typeof lv.block === "string" ? lv.block : null,
      level: typeof lv.level === "string" ? lv.level : null,
      order: typeof lv.order === "number" ? lv.order : null,
      included: true,
      section_pins: [],
      plots,
    });
  }

  return { sections };
}

function mapQuoteApiPinsToDraft(pins: QuotationQuoteSectionPin[]): QuotationDraftLine[] {
  return [...pins]
    .sort((a, b) => a.pins_order - b.pins_order)
    .map((p) => ({
      id: newQuotationDraftId("line"),
      pin_id: typeof p.pin_id === "number" && p.pin_id > 0 ? p.pin_id : null,
      composite_item_id: p.composite_item_id,
      name:
        typeof p.name === "string" && p.name.trim()
          ? p.name.trim()
          : p.composite_item_id != null
            ? `Composite #${p.composite_item_id}`
            : "—",
      quantity: p.quantity,
      selling_price: p.selling_price,
      pin_count: 1,
      source_pins: Array.isArray(p.source_pins) ? p.source_pins : [],
    }));
}

function splitSectionPlots(plots: QuotationQuoteSectionPlot[]): { sectionPins: QuotationDraftLine[]; plots: QuotationDraftPlot[] } {
  const sectionPins: QuotationDraftLine[] = [];
  const outPlots: QuotationDraftPlot[] = [];
  const sorted = [...plots].sort((a, b) => a.plot_order - b.plot_order);
  for (const p of sorted) {
    const isDirect =
      p.plot_id == null && (p.name === SECTION_DIRECT_PLOT_NAME || p.name.trim() === SECTION_DIRECT_PLOT_NAME.trim());
    const apiPins = getQuotePlotPinsForDisplay(p);
    if (isDirect) {
      sectionPins.push(...mapQuoteApiPinsToDraft(apiPins));
    } else {
      outPlots.push({
        id: newQuotationDraftId("plot"),
        plot_id: typeof p.plot_id === "number" && p.plot_id > 0 ? p.plot_id : null,
        name: typeof p.name === "string" && p.name.trim() ? p.name.trim() : `Plot ${p.plot_id ?? ""}`,
        coordinates: Array.isArray(p.coordinates) ? p.coordinates : null,
        plot_border: typeof p.plot_border === "string" ? p.plot_border : null,
        plot_bg: typeof p.plot_bg === "string" ? p.plot_bg : null,
        pins: mapQuoteApiPinsToDraft(apiPins),
      });
    }
  }
  return { sectionPins, plots: outPlots };
}

/**
 * Seeds a draft from persisted `quote_sections` (edit flow). Preserves API ordering; assigns new client ids for DnD state.
 */
export function seedDraftFromQuoteSections(quoteSections: QuotationQuoteSection[]): QuotationDraft {
  const sortedSections = [...quoteSections].sort((a, b) => a.section_order - b.section_order);
  const sections: QuotationDraftSection[] = sortedSections.map((sec) => {
    const plotsSrc = Array.isArray(sec.plots) ? sec.plots : [];
    const { sectionPins, plots } = splitSectionPlots(plotsSrc);
    return {
      id: newQuotationDraftId("sec"),
      level_id: typeof sec.level_id === "number" && sec.level_id > 0 ? sec.level_id : null,
      name: typeof sec.name === "string" && sec.name.trim() ? sec.name.trim() : "Section",
      drawing_file: typeof sec.drawing_file === "string" ? sec.drawing_file : null,
      drawing_file_type: typeof sec.drawing_file_type === "string" ? sec.drawing_file_type : null,
      drawing_file_size: typeof sec.drawing_file_size === "number" ? sec.drawing_file_size : null,
      block: typeof sec.block === "string" ? sec.block : null,
      level: typeof sec.level === "string" ? sec.level : null,
      order: typeof sec.order === "number" ? sec.order : null,
      included: true,
      section_pins: sectionPins,
      plots,
    };
  });
  return { sections };
}
