/** Client-side draft for quotation composition (create flow). Synced from project levels API only as initial seed; edits stay local until create quotation API. */

export type QuotationDraftLine = {
  id: string;
  /** From API when editing an existing pin; omitted or null for pins created only in the draft. */
  pin_id?: number | null;
  composite_item_id: number | null;
  name: string;
  quantity: number;
  selling_price: number;
};

export type QuotationDraftPlot = {
  id: string;
  plot_id: number | null;
  name: string;
  pins: QuotationDraftLine[];
};

export type QuotationDraftSection = {
  id: string;
  level_id: number | null;
  name: string;
  included: boolean;
  /** Composite pins on the section itself (not tied to a drawing plot). */
  section_pins: QuotationDraftLine[];
  plots: QuotationDraftPlot[];
};

export type QuotationDraft = {
  sections: QuotationDraftSection[];
};
