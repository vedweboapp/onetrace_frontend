import type { QuotationQuoteSectionSourcePin } from "@/features/quotations/types/quotation.types";

/** Client-side draft for quotation composition (create flow). Synced from project levels API only as initial seed; edits stay local until create quotation API. */

export type QuotationDraftLine = {
  id: string;
  /** From API when editing an existing pin; omitted or null for pins created only in the draft. */
  pin_id?: number | null;
  composite_item_id: number | null;
  name: string;
  quantity: number;
  selling_price: number;
  /** How many drawing pins this line represents (not catalog/item stock quantity). */
  pin_count?: number;
  source_pins?: QuotationQuoteSectionSourcePin[];
};

export type QuotationDraftPlot = {
  id: string;
  plot_id: number | null;
  name: string;
  coordinates?: number[][] | null;
  plot_border?: string | null;
  plot_bg?: string | null;
  pins: QuotationDraftLine[];
};

export type QuotationDraftSection = {
  id: string;
  level_id: number | null;
  name: string;
  drawing_file?: string | null;
  drawing_file_type?: string | null;
  drawing_file_size?: number | null;
  block?: string | null;
  level?: string | null;
  order?: number | null;
  included: boolean;
  /** Composite pins on the section itself (not tied to a drawing plot). */
  section_pins: QuotationDraftLine[];
  plots: QuotationDraftPlot[];
};

export type QuotationDraft = {
  sections: QuotationDraftSection[];
};
