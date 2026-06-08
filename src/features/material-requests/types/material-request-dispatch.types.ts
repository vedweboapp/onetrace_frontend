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
  /** Per underlying MR line — legacy. */
  line_key?: string;
  /** Per product — backend allocates across source lines. */
  item_id?: number;
  quantity: number;
};

export type MaterialRequestDispatchExtraItemInput = {
  item: number;
  quantity: number;
};

export type MaterialRequestDispatchPayload = {
  lines: MaterialRequestDispatchLineInput[];
  extra_items: MaterialRequestDispatchExtraItemInput[];
};
