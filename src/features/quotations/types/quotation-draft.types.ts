/** Client-side draft for quotation composition (create flow). Synced from project levels API only as initial seed; edits stay local until create quotation API. */

export type QuotationDraftLine = {
  id: string;
  composite_item_id: number | null;
  name: string;
  quantity: number;
  unit_price: number;
};

export type QuotationDraftPlot = {
  id: string;
  plot_id: number | null;
  name: string;
  lines: QuotationDraftLine[];
};

export type QuotationDraftSection = {
  id: string;
  level_id: number | null;
  name: string;
  included: boolean;
  /** Composite lines on the section itself (not tied to a drawing plot). */
  section_lines: QuotationDraftLine[];
  plots: QuotationDraftPlot[];
};

export type QuotationDraft = {
  sections: QuotationDraftSection[];
};
