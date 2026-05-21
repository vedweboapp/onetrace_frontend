import type { QuotationDraftLine } from "@/features/quotations/types/quotation-draft.types";

export type QuotationScopeBlock = {
  key: string;
  sectionName: string;
  /** Plot / block display name shown at top of detail page. */
  blockName: string;
  lines: QuotationDraftLine[];
};

export type QuotationBlockScopeSession = {
  backHref: string;
  blocks: QuotationScopeBlock[];
  activeBlockKey: string;
};

export type QuotationBlockScopeTableRow = {
  rowKey: string;
  name: string;
  /** Catalog / pin quantity (`Pins.quantity`). */
  quantity: number;
  listPrice: number;
  amount: number;
  discount: number;
  tax: number;
  total: number;
};
