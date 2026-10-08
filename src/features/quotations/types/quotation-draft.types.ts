import type {
  QuotationQuoteSectionKind,
  QuotationQuoteSectionSourcePin,
} from "@/features/quotations/types/quotation.types";

export type { QuotationQuoteSectionKind };

/** Client-side draft for quotation composition (create flow). Synced from project levels API only as initial seed; edits stay local until create quotation API. */

export type QuotationDraftLine = {
  id: string;
  /** From API when editing an existing pin; omitted or null for pins created only in the draft. */
  pin_id?: number | null;
  composite_item_id: number | null;
  name: string;
  quantity: number;
  selling_price: number;
  /** Selected product group when the line was added (service quote manual lines). */
  group_id?: number | null;
  group_name?: string | null;
  /**
   * True when the line is a composite kit; false for a plain catalog item
   * (still stored under `composite_item_id` for API compatibility).
   */
  is_composite?: boolean;
  /** How many drawing pins this line represents (not catalog/item stock quantity). */
  pin_count?: number;
  source_pins?: QuotationQuoteSectionSourcePin[];
};

/** Service catalog item line on a section (replaces legacy labour-type lines). */
export type QuotationDraftServiceLine = {
  id: string;
  /** Catalog item id (`item_type=service`). */
  item_id: number | null;
  item_name?: string | null;
  cost_price: number;
  markup_percentage: number;
  /** Unit selling price (before time). */
  selling_price: number;
  /** Hours; line total = selling_price × time_hours. */
  time_hours: number;
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
  description?: string;
  notes?: string;
  drawing_file?: string | null;
  drawing_file_type?: string | null;
  drawing_file_size?: number | null;
  block?: string | null;
  level?: string | null;
  order?: number | null;
  included: boolean;
  /**
   * Scope bucket sent as API `section_type`:
   * - service quote Primary / Optional tabs → primary | optional
   * - project quote (manual or level-seeded) → project
   */
  kind?: QuotationQuoteSectionKind;
  /** Service catalog lines (item_type=service). */
  services: QuotationDraftServiceLine[];
  /** Composite / catalog pins on the section itself (not tied to a drawing plot). */
  section_pins: QuotationDraftLine[];
  plots: QuotationDraftPlot[];
};

export type QuotationDraft = {
  sections: QuotationDraftSection[];
};
