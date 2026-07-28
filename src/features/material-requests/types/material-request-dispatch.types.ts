export type MaterialRequestExtraItemRef = {
  id: number;
  name?: string | null;
  sku?: string | null;
};

export type MaterialRequestExtraDispatchItem = {
  id: string;
  item: number | MaterialRequestExtraItemRef;
  item_name?: string | null;
  quantity: number;
  dispatched_at?: string | null;
};

export type MaterialRequestDispatchLineInput = {
  /** Per underlying material request line. */
  material_request_line?: number;
  /** Per product, when dispatching aggregated or extra items. */
  item?: number;
  /** Legacy support for old payload shape. */
  item_id?: number;
  /** Legacy support for old payload shape. */
  line_key?: string;
  quantity: number;
  is_extra?: boolean;
};

export type MaterialRequestDispatchExtraItemInput = {
  item: number;
  quantity: number;
  is_extra?: boolean;
};

export type MaterialRequestDispatchPayload = {
  material_request: number;
  dispatch_date: string;
  notes?: string | null;
  lines: MaterialRequestDispatchLineInput[];
  extra_items?: MaterialRequestDispatchExtraItemInput[];
};
